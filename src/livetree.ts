import * as chokidar from 'chokidar'
import * as fs from "fs"
import { registerHooks } from 'module'
import * as posix from "path/posix"
import { relative } from "path/posix"
import { Pipeline } from './pipeline.js'

declare module "module" {
  export function registerHooks(opts: {
    load?: (url: string, context: LoadHookContext, nextLoad: (url: string, context?: Partial<LoadHookContext>) => LoadFnOutput) => LoadFnOutput,
    resolve?: (specifier: string, context: ResolveHookContext, nextResolve: (specifier: string, context?: Partial<ResolveHookContext>) => ResolveFnOutput) => ResolveFnOutput,
  }): void
}

export class LiveTree {

  public path: string
  public root: string

  public files = new Map<string, { path: string, content: Buffer, version: number }>();
  private deps = new Map<string, Set<string>>();

  public constructor(path: string, importMetaUrl: string) {
    this.path = path
    this.root = new URL(this.path, importMetaUrl).href
    this.loadDir('/')
  }

  public async processFiles(fn: (pipeline: Pipeline) => void | Promise<void>) {
    const pipeline = Pipeline.from(this.files)
    await fn(pipeline)
    return pipeline.results()
  }

  private loadDir(base: string) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const realFilePath = posix.join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)

      if (stat.isDirectory()) {
        this.loadDir(posix.join(base, name))
      }
      else if (stat.isFile()) {
        const filepath = posix.join(base, name)
        this.createFile(filepath)
      }
    }
  }

  private createFile(path: string) {
    const content = fs.readFileSync(this.realPathFor(path))
    const version = Date.now()
    this.deleteFromCache(path)
    this.files.set(path, { path, content, version })
  }

  private deleteFromCache(path: string) {
    // No way to do this yet
    // See https://github.com/nodejs/node/issues/57696
  }

  private realPathFor(filepath: string) {
    return posix.join(this.path, filepath)
  }

  private addDep(requiredBy: string, requiring: string) {
    let list = this.deps.get(requiring)
    if (!list) this.deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  private pathsUpdated(...paths: string[]) {
    const filepaths = paths.map(p => p.slice(this.path.length))

    for (const filepath of filepaths) {
      if (fs.existsSync(this.realPathFor(filepath))) {
        this.createFile(filepath)
      }
      else {
        this.files.delete(filepath)
      }
    }

    const resetSeen = new Set<string>()
    for (const filepath of filepaths) {
      this.resetDepTree(filepath, resetSeen)
    }
  }

  private resetDepTree(path: string, seen: Set<string>) {
    if (seen.has(path)) return
    seen.add(path)

    for (const [requiring, requiredBy] of this.deps) {
      if (path.startsWith(requiring)) {
        this.deps.delete(requiring)
        for (const dep of requiredBy) {
          const file = this.files.get(dep)!
          file.version = Date.now()
          this.deleteFromCache(dep)
          this.resetDepTree(dep, seen)
        }
      }
    }
  }

  public watch(opts?: chokidar.ChokidarOptions, onchange?: (paths: Set<string>) => void) {
    const updatedPaths = new Set<string>()
    let reloadFsTimer: NodeJS.Timeout

    const pathUpdated = (filePath: string) => {
      updatedPaths.add(filePath.split(posix.win32.sep).join(posix.posix.sep))
      clearTimeout(reloadFsTimer)
      reloadFsTimer = setTimeout(async () => {
        try {
          this.pathsUpdated(...updatedPaths)
          onchange?.(updatedPaths)
          updatedPaths.clear()
        }
        catch (e) {
          console.error(e)
        }
      }, 100)
    }

    chokidar.watch(this.path, {
      ...opts,
      ignoreInitial: true,
      cwd: process.cwd(),
    })
      .on('add', pathUpdated)
      .on('change', pathUpdated)
      .on('unlink', pathUpdated)
  }

  public moduleHook(): Parameters<typeof registerHooks>[0] {
    return {

      resolve: (spec, context, next) => {
        if (!spec.match(/^(\.|\/|file:\/\/\/)/)) return next(spec, context)

        let path = new URL(spec, context.parentURL).href
        if (!path.startsWith(this.root)) return next(spec, context)

        const found = this.files.get('/' + relative(this.root, path))
        if (!found) return next(spec, context)

        if (context.parentURL?.startsWith(this.root) && !context.parentURL.endsWith('/noop.js')) {
          const depending = context.parentURL.slice(this.root.length).replace(/\?ver=\d+$/, '')
          const depended = path.slice(this.root.length)
          this.addDep(depending, depended)
        }

        const newurl = new URL('.' + found.path, this.root + '/')
        newurl.search = `ver=${found.version}`

        return { url: newurl.href, shortCircuit: true }
      },

      load: (url, context, next) => {
        if (url.startsWith(this.root)) {
          url = url.replace(/\?ver=\d+$/, '')

          const found = this.files.get(url.slice(this.root.length))
          if (!found) return next(url, context)

          return {
            shortCircuit: true,
            format: found.path.match(/\.tsx?(\?|$)/) ? 'module-typescript' : 'module',
            source: found.content,
          }
        }
        return next(url, context)
      }

    }
  }

}
