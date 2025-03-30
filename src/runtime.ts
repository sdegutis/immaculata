import * as fs from "fs"
import * as path from "path/posix"
import { fileURLToPath } from "url"
import { Compiler } from "./compiler.ts"
import { convertTsExts, File } from "./file.ts"
import { processSite } from "./ssp.ts"

const jsxDom = fs.readFileSync(fileURLToPath(import.meta.resolve('./jsx-dom.ts')))
const jsxStrings = fs.readFileSync(fileURLToPath(import.meta.resolve('./jsx-strings.ts')))

export class Runtime {

  siteDir = 'site'
  processor: (files: FsFile[]) => FsFile[] = processSite
  jsxContentSsg = jsxStrings
  jsxContentBrowser = jsxDom
  jsxPathNode = '/@imlib/jsx-node.ts'
  jsxPathBrowser = '/@imlib/jsx-browser.ts'

  files = new Map<string, File>();
  #deps = new Map<string, Set<string>>();
  handlers = new Map<string, (body: string) => string>();
  compiler = new Compiler(this.jsxPathNode, this.jsxPathBrowser);

  build() {
    this.#shimIfNeeded(this.jsxPathBrowser, this.jsxContentBrowser)
    this.#shimIfNeeded(this.jsxPathNode, this.jsxContentSsg)

    const start = Date.now()
    const outFiles = this.processor([...this.files.values()])
    console.log(`Time: ${Date.now() - start} ms`)
    return new Map<string, Uint8Array | string>(outFiles.map(f => [f.path, f.content]))
  }

  rebuildAll() {
    this.#loadDir('/')
  }

  pathsUpdated(...paths: string[]) {
    const filepaths = paths.map(p => p.slice(this.siteDir.length))

    for (const filepath of filepaths) {
      if (filepath.endsWith('.d.ts')) continue
      if (fs.existsSync(this.realPathFor(filepath))) {
        this.#createFile(filepath)
      }
      else {
        this.files.delete(convertTsExts(filepath))
      }
    }

    const resetSeen = new Set<string>()
    for (const filepath of filepaths) {
      this.#resetDepTree(filepath, resetSeen)
    }
  }

  #loadDir(base: string) {
    const dirRealPath = this.realPathFor(base)
    const files = fs.readdirSync(dirRealPath)
    for (const name of files) {
      if (name.startsWith('.')) continue
      if (name.endsWith('.d.ts')) continue

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
    const file = new File(filepath, content, this)
    this.files.set(file.path, file)
  }

  #shimIfNeeded(filepath: string, content: Uint8Array) {
    if (!this.files.has(convertTsExts(filepath))) {
      this.#putFile(filepath, content)
    }
  }

  realPathFor(filepath: string) {
    return path.join(this.siteDir, filepath)
  }

  addDeps(requiredBy: string, requiring: string) {
    let list = this.#deps.get(requiring)
    if (!list) this.#deps.set(requiring, list = new Set())
    list.add(requiredBy)
  }

  #resetDepTree(path: string, seen: Set<string>) {
    if (seen.has(path)) return
    seen.add(path)

    for (const [requiring, requiredBy] of this.#deps) {
      if (path.startsWith(requiring)) {
        this.#deps.delete(requiring)
        for (const dep of requiredBy) {
          const module = this.files.get(convertTsExts(dep))?.module
          module?.resetExports()
          this.#resetDepTree(dep, seen)
        }
      }
    }
  }

}
