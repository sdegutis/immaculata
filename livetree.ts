import * as fs from "fs"
import * as path from "path/posix"

export class LiveTree {

  root = 'site'

  files = new Map<string, { path: string, content: Buffer, version: number }>();
  #deps = new Map<string, Set<string>>();
  updates = 0

  loadTree() {
    this.#loadDir('/')
  }

  #loadDir(base: string) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      const realFilePath = path.join(dirRealPath, name)
      const stat = fs.statSync(realFilePath)

      if (stat.isDirectory()) {
        this.#loadDir(path.join(base, name))
      }
      else if (stat.isFile()) {
        const filepath = path.join(base, name)
        this.#createFile(filepath)
      }
    }
  }

  #createFile(filepath: string) {
    this.#putFile(filepath, fs.readFileSync(this.realPathFor(filepath)))
  }

  #putFile(filepath: string, content: Buffer) {
    this.files.set(filepath, { path: filepath, content, version: this.updates })
  }

  private realPathFor(filepath: string) {
    return path.join(this.root, filepath)
  }

  addDep(requiredBy: string, requiring: string) {
    console.log('adddep', [requiredBy, requiring])

    let list = this.#deps.get(requiring)
    if (!list) this.#deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  pathsUpdated(...paths: string[]) {
    this.updates++
    const filepaths = paths.map(p => p.slice(this.root.length))

    console.log(this.#deps)

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

          console.log('    reset exports of', dep)

          const file = this.files.get(dep)
          file.version++

          this.#resetDepTree(dep, seen)
        }
      }
    }
  }

}
