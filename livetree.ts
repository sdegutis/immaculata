import * as fs from "fs"
import { join } from "path/posix"

export class LiveTree {

  root: string

  files = new Map<string, { path: string, content: Buffer, version: number }>();
  #deps = new Map<string, Set<string>>();

  constructor(root: string, importMetaUrl: string) {
    this.root = root
  }

  loadTree() {
    this.#loadDir('/')
  }

  #loadDir(base: string) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const realFilePath = join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)

      if (stat.isDirectory()) {
        this.#loadDir(join(base, name))
      }
      else if (stat.isFile()) {
        const filepath = join(base, name)
        this.#createFile(filepath)
      }
    }
  }

  #createFile(path: string) {
    const content = fs.readFileSync(this.realPathFor(path))
    const version = Date.now()
    this.files.set(path, { path: path, content, version })
  }

  private realPathFor(filepath: string) {
    return join(this.root, filepath)
  }

  addDep(requiredBy: string, requiring: string) {
    let list = this.#deps.get(requiring)
    if (!list) this.#deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  pathsUpdated(...paths: string[]) {
    const filepaths = paths.map(p => p.slice(this.root.length))

    for (const filepath of filepaths) {
      if (fs.existsSync(this.realPathFor(filepath))) {
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

}
