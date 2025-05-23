import { EventEmitter } from "events"
import * as fs from "fs"
import * as posix from "path/posix"
import { fileURLToPath } from "url"

export type TreeFile = {
  path: string,
  content: Buffer,
  version: number,
  requiredBy: (requiredBy: string) => void,
}

export type ShouldExcludeFile = (path: string, stat: fs.Stats) => any
export type FileTreeChange = { path: string, change: 'add' | 'dif' | 'rem' }

export class FileTree {

  /** The full file URL. Never ends with `'/'` */
  public root: string
  private exclude?: ShouldExcludeFile | undefined

  public files = new Map<string, TreeFile>();

  public constructor(path: string, importMetaUrl: string, opts?: {
    exclude?: ShouldExcludeFile,
  }) {
    this.root = new URL(path, importMetaUrl).href.replace(/\/+$/, '')
    this.exclude = opts?.exclude
    this.loadDir('/')
  }

  private loadDir(base: string, meta?: { changes: FileTreeChange[], invalidated: Set<string> }) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const normalizedPath = posix.join(base, name)
      const realFilePath = posix.join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)
      this.maybeAdd(normalizedPath, stat, meta)
    }
  }

  private maybeAdd(path: string, stat: fs.Stats, meta?: { changes: FileTreeChange[], invalidated: Set<string> }) {
    if (stat.isDirectory()) {
      if (this.exclude?.(path + '/', stat)) return
      this.loadDir(path, meta)
    }
    else if (stat.isFile()) {
      if (this.exclude?.(path, stat)) return
      this.createFile(path, meta)
    }
  }

  private createFile(path: string, meta?: { changes: FileTreeChange[], invalidated: Set<string> }) {
    const content = fs.readFileSync(this.realPathFor(path))
    const existing = this.files.get(path)
    if (existing) {
      if (content.equals(existing.content)) {
        return
      }
      meta?.changes.push({ path, change: 'dif' })
    }
    else {
      meta?.changes.push({ path, change: 'add' })
    }

    this.invalidateModule(path, meta?.invalidated)

    const version = Date.now()
    const requiredBy = (by: string) => this.addDependency(by, path)
    this.files.set(path, { path, content, version, requiredBy })
  }

  private moduleInvalidated = new EventEmitter()

  private invalidateModule(path: string, invalidated?: Set<string>) {
    // No way to delete it from module cache yet
    // See https://github.com/nodejs/node/issues/57696

    if (invalidated?.has(path)) return
    invalidated?.add(path)

    this.fsevents?.emit('moduleInvalidated', path)
    this.moduleInvalidated.emit(path)
  }

  /** Requires `useTree` hook. Must be called from within module passing `import.meta.url`. */
  public onModuleInvalidated(importMetaUrl: string, fn: () => void) {
    this.moduleInvalidated.once(importMetaUrl.slice(this.root.length).replace(/\?.+/, ''), fn)
  }

  private realPathFor(filepath: string) {
    return fileURLToPath(new URL(filepath.slice(1), this.root + '/'))
  }

  private deps = new Map<string, Set<string>>();

  /** Makes changes to file at `requiring` invalidate module at `requiredBy` */
  public addDependency(requiredBy: string, requiring: string) {
    if (requiredBy.startsWith('file://')) requiredBy = requiredBy.slice(this.root.length)
    requiredBy = requiredBy.replace(/\?ver=\d+$/, '')
    let list = this.deps.get(requiring)
    if (!list) this.deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  private pathsUpdated(...paths: string[]) {
    const changes: FileTreeChange[] = []
    const invalidated = new Set<string>()

    for (const filepath of paths) {
      const realPath = this.realPathFor(filepath)
      const stat = fs.existsSync(realPath) ? fs.statSync(realPath) : undefined

      if (stat) {
        this.maybeAdd(filepath, stat, { changes, invalidated })
      }
      else {
        if (this.files.delete(filepath)) {
          changes.push({ path: filepath, change: 'rem' })
        }
        this.files.keys().forEach(path => {
          if (path.startsWith(filepath + '/')) {
            changes.push({ path, change: 'rem' })
            this.files.delete(path)
          }
        })
      }
    }

    const resetSeen = new Set<string>()
    for (const change of changes) {
      this.resetDepTree(change.path, resetSeen, invalidated)
    }

    return changes
  }

  private resetDepTree(path: string, seen: Set<string>, invalidated: Set<string>) {
    if (seen.has(path)) return
    seen.add(path)

    for (const [requiring, requiredBy] of this.deps) {
      if (path.startsWith(requiring)) {
        this.deps.delete(requiring)
        for (const dep of requiredBy) {
          const file = this.files.get(dep)!
          file.version = Date.now()
          this.invalidateModule(dep, invalidated)
          this.resetDepTree(dep, seen, invalidated)
        }
      }
    }
  }

  private fsevents?: EventEmitter<{
    filesUpdated: [changes: FileTreeChange[]],
    moduleInvalidated: [path: string],
  }>

  public watch(debounce = 100) {
    if (!this.fsevents) {
      const fsevents = this.fsevents = new EventEmitter()

      const updatedPaths = new Set<string>()
      let reloadFsTimer: NodeJS.Timeout

      fs.watch(fileURLToPath(this.root), { recursive: true }, ((type, filename) => {
        if (!filename) return
        const normalized = '/' + filename.split(posix.win32.sep).join(posix.posix.sep)

        updatedPaths.add(normalized)

        clearTimeout(reloadFsTimer)
        reloadFsTimer = setTimeout(async () => {
          try {
            const changes = this.pathsUpdated(...updatedPaths)
            if (changes.length > 0) fsevents.emit('filesUpdated', changes)
            updatedPaths.clear()
          }
          catch (e) {
            console.error(e)
          }
        }, debounce)
      }))
    }

    return this.fsevents
  }

}
