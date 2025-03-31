import * as chokidar from 'chokidar'
import * as fs from "fs"
import posix from "path/posix"

export class LiveTree {

  root: string
  base: string

  files = new Map<string, { path: string, content: Buffer, version: number }>();
  #deps = new Map<string, Set<string>>();

  constructor(root: string, importMetaUrl: string) {
    this.root = root
    this.base = new URL(this.root, importMetaUrl).href
    this.#loadDir('/')
  }

  #loadDir(base: string) {
    const dirRealPath = this.#realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const realFilePath = posix.join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)

      if (stat.isDirectory()) {
        this.#loadDir(posix.join(base, name))
      }
      else if (stat.isFile()) {
        const filepath = posix.join(base, name)
        this.#createFile(filepath)
      }
    }
  }

  #createFile(path: string) {
    const content = fs.readFileSync(this.#realPathFor(path))
    const version = Date.now()
    this.files.set(path, { path, content, version })
  }

  #realPathFor(filepath: string) {
    return posix.join(this.root, filepath)
  }

  addDep(requiredBy: string, requiring: string) {
    let list = this.#deps.get(requiring)
    if (!list) this.#deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  #pathsUpdated(...paths: string[]) {
    const filepaths = paths.map(p => p.slice(this.root.length))

    for (const filepath of filepaths) {
      if (fs.existsSync(this.#realPathFor(filepath))) {
        this.#createFile(filepath)
      }
      else {
        this.files.delete(filepath)
      }
    }

    const resetSeen = new Set<string>()
    for (const filepath of filepaths) {
      this.#resetDepTree(filepath, resetSeen)
    }
  }

  #resetDepTree(path: string, seen: Set<string>) {
    if (seen.has(path)) return
    seen.add(path)

    for (const [requiring, requiredBy] of this.#deps) {
      if (path.startsWith(requiring)) {
        this.#deps.delete(requiring)
        for (const dep of requiredBy) {
          const file = this.files.get(dep)!
          file.version = Date.now()
          this.#resetDepTree(dep, seen)
        }
      }
    }
  }

  watch(opts: chokidar.ChokidarOptions, onchange: (paths: Set<string>) => void) {
    const updatedPaths = new Set<string>()
    let reloadFsTimer: NodeJS.Timeout

    const pathUpdated = (filePath: string) => {
      updatedPaths.add(filePath.split(posix.win32.sep).join(posix.posix.sep))
      clearTimeout(reloadFsTimer)
      reloadFsTimer = setTimeout(async () => {
        try {
          this.#pathsUpdated(...updatedPaths)
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

}
