import * as fs from "fs"
import * as path from "path/posix"

export class LiveTree {

  siteDir = 'site'
  files = new Map<string, { path: string, content: Uint8Array, version: number }>();

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

  #putFile(filepath: string, content: Uint8Array) {
    this.files.set(filepath, { path: filepath, content, version: 1 })
  }

  realPathFor(filepath: string) {
    return path.join(this.siteDir, filepath)
  }

  addDep(depending: string, depended: string) {

  }

}
