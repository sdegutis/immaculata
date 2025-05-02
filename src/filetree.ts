import * as fs from "fs"
import { registerHooks } from 'module'
import * as posix from "path/posix"
import { relative } from "path/posix"
import { fileURLToPath } from "url"

export type TreeFile = {
  path: string,
  content: Buffer,
  version: number,
  requiredBy: (requiredBy: string) => void,
}

type ShouldRejectFile = ((path: string, stat: fs.Stats) => any)

export class FileTree {

  public path: string
  public root: string
  private rejectFile?: ShouldRejectFile | undefined
  private rejectDir?: ShouldRejectFile | undefined

  public files = new Map<string, TreeFile>();
  private deps = new Map<string, Set<string>>();

  public constructor(path: string, importMetaUrl: string, opts?: {
    rejectFile?: ShouldRejectFile,
    rejectDir?: ShouldRejectFile,
  }) {
    this.path = path
    this.root = new URL(this.path, importMetaUrl).href
    this.rejectFile = opts?.rejectFile
    this.rejectDir = opts?.rejectDir
    this.loadDir('/')
  }

  private loadDir(base: string) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const normalizedPath = posix.join(base, name)
      const realFilePath = posix.join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)
      this.maybeAdd(normalizedPath, stat)
    }
  }

  private maybeAdd(path: string, stat: fs.Stats) {
    if (stat.isDirectory()) {
      if (this.rejectDir?.(path, stat)) return
      this.loadDir(path)
    }
    else if (stat.isFile()) {
      if (this.rejectFile?.(path, stat)) return
      this.createFile(path)
    }
  }

  private createFile(path: string) {
    const content = fs.readFileSync(this.realPathFor(path))
    const version = Date.now()
    this.deleteFromCache(path)
    const requiredBy = (by: string) => {
      if (by.startsWith('file://')) by = by.slice(this.root.length)
      this.addDep(by, path)
    }
    this.files.set(path, { path, content, version, requiredBy })
  }

  private deleteFromCache(path: string) {
    // No way to do this yet
    // See https://github.com/nodejs/node/issues/57696
  }

  private realPathFor(filepath: string) {
    return fileURLToPath(new URL(filepath.slice(1), this.root + '/'))
  }

  private addDep(requiredBy: string, requiring: string) {
    requiredBy = requiredBy.replace(/\?ver=\d+$/, '')
    let list = this.deps.get(requiring)
    if (!list) this.deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  private pathsUpdated(...paths: string[]) {
    for (const filepath of paths) {
      const realPath = this.realPathFor(filepath)
      const stat = fs.existsSync(realPath) ? fs.statSync(realPath) : undefined

      if (stat) {
        this.maybeAdd(filepath, stat)
      }
      else {
        this.files.delete(filepath)
        this.files.keys().forEach(path => {
          if (path.startsWith(filepath + '/')) {
            this.files.delete(path)
          }
        })
      }
    }

    const resetSeen = new Set<string>()
    for (const filepath of paths) {
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

  public watch(opts?: {
    ignored?: (path: string) => boolean
    debounceMs?: number
  }, onchange?: (paths: Set<string>) => void) {
    let updatedPaths = new Set<string>()
    let reloadFsTimer: NodeJS.Timeout

    const debounce = opts?.debounceMs ?? 100

    return fs.watch(fileURLToPath(this.root), { recursive: true }, ((type, filePath) => {
      if (!filePath) return
      const normalized = '/' + filePath.split(posix.win32.sep).join(posix.posix.sep)

      if (opts?.ignored?.(normalized)) return
      updatedPaths.add(normalized)

      clearTimeout(reloadFsTimer)
      reloadFsTimer = setTimeout(async () => {
        try {
          this.pathsUpdated(...updatedPaths)
          onchange?.(updatedPaths)
          updatedPaths = new Set()
        }
        catch (e) {
          console.error(e)
        }
      }, debounce)
    }))
  }

  public enableImportsModuleHook(): Parameters<typeof registerHooks>[0] {
    return {

      resolve: (spec, context, next) => {
        if (!spec.match(/^(\.|\/|file:\/\/\/)/)) return next(spec, context)

        let path = new URL(spec, context.parentURL).href
        if (!path.startsWith(this.root)) return next(spec, context)

        const found = this.files.get('/' + relative(this.root, path))
        if (!found) return next(spec, context)

        if (context.parentURL?.startsWith(this.root) && !context.parentURL.endsWith('/noop.js')) {
          const depending = context.parentURL.slice(this.root.length)
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
