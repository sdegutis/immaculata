import * as chokidar from 'chokidar'
import * as fs from "fs"
import { registerHooks } from 'module'
import * as posix from "path/posix"
import { dirname, relative } from "path/posix"

declare module "module" {
  export function registerHooks(opts: {
    load?: LoadHook,
    resolve?: ResolveHook,
  }): void
}

export type JsxTransformer = (
  treeRoot: string,
  filename: string,
  src: string,
  tsx: boolean,
) => string

export type MemFile = { path: string, content: Buffer }

export class LiveTree {

  public root: string
  public base: string

  public files = new Map<string, { path: string, content: Buffer, version: number }>();
  private deps = new Map<string, Set<string>>();

  public constructor(root: string, importMetaUrl: string) {
    this.root = root
    this.base = new URL(this.root, importMetaUrl).href
    this.loadDir('/')
  }

  public async processFiles(fn: (files: MemFile[]) => MemFile[] | Promise<MemFile[]>) {
    let files: MemFile[] = [...this.files.values().map(f => ({ ...f }))]
    files = await fn(files)
    return new Map(files.map(f => [f.path, f.content]))
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
    return posix.join(this.root, filepath)
  }

  private addDep(requiredBy: string, requiring: string) {
    let list = this.deps.get(requiring)
    if (!list) this.deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  private pathsUpdated(...paths: string[]) {
    const filepaths = paths.map(p => p.slice(this.root.length))

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

  public watch(opts: chokidar.ChokidarOptions, onchange: (paths: Set<string>) => void) {
    const updatedPaths = new Set<string>()
    let reloadFsTimer: NodeJS.Timeout

    const pathUpdated = (filePath: string) => {
      updatedPaths.add(filePath.split(posix.win32.sep).join(posix.posix.sep))
      clearTimeout(reloadFsTimer)
      reloadFsTimer = setTimeout(async () => {
        try {
          this.pathsUpdated(...updatedPaths)
          onchange(updatedPaths)
          updatedPaths.clear()
        }
        catch (e) {
          console.error(e)
        }
      }, 100)
    }

    chokidar.watch(this.root, {
      ...opts,
      ignoreInitial: true,
      cwd: process.cwd(),
    })
      .on('add', pathUpdated)
      .on('change', pathUpdated)
      .on('unlink', pathUpdated)
  }

  public enableModules(transformJsx?: JsxTransformer) {

    registerHooks({

      resolve: (url, context, next) => {
        if (!url.match(/^(\.|\/|file:\/\/\/)/)) {
          return next(url, context)
        }

        let path = new URL(url, context.parentURL).href

        if (!path.startsWith(this.base)) {
          return next(url, context)
        }

        if (context.parentURL?.startsWith(this.base) && !context.parentURL.endsWith('/noop.js')) {
          const depending = context.parentURL.slice(this.base.length).replace(/\?ver=\d+$/, '')
          const depended = path.slice(this.base.length)
          this.addDep(depending, depended)
        }

        const rel = '/' + relative(this.base, path)
        const found = (
          this.files.get(rel) ??
          this.files.get(rel + '.ts') ??
          this.files.get(rel + '.tsx') ??
          this.files.get(rel + '.jsx'))

        if (!found) {
          return next(url, context)
        }

        const newurl = new URL('.' + found.path, this.base + '/')
        newurl.search = `ver=${found.version}`

        return {
          url: newurl.href,
          shortCircuit: true,
        }
      },

      load: (url, context, next) => {
        if (url.startsWith(this.base)) {
          url = url.replace(/\?ver=\d+$/, '')

          const path = url.slice(this.base.length)
          const found = this.files.get(path)

          if (!found) {
            return next(url, context)
          }

          const tsx = path.endsWith('.tsx')
          const jsx = path.endsWith('.jsx')

          if (transformJsx && (tsx || jsx)) {
            const toRoot = relative(dirname(url), this.base) || '.'
            const src = found.content.toString()
            const output = transformJsx(toRoot, url, src, tsx)
            return {
              format: 'module',
              shortCircuit: true,
              source: output,
            }
          }

          return {
            format: path.match(/\.tsx?$/) ? 'module-typescript' : 'module',
            shortCircuit: true,
            source: found.content,
          }
        }

        return next(url, context)
      }

    })

  }

}
