import * as swc from '@swc/core'
import * as chokidar from 'chokidar'
import { randomUUID } from 'crypto'
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

export type LiveFile = { path: string, content: string | Buffer }

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

  processFiles(fn: (files: LiveFile[]) => LiveFile[]) {
    let files: LiveFile[] = [...this.files.values()]
    files = fn(files)
    return new Map(files.map(f => [f.path, f.content]))
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

  #addDep(requiredBy: string, requiring: string) {
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

  enableModules(transformJsx: JsxTransformer = defaultSwcTransformJsx) {

    registerHooks({

      resolve: (url, context, next) => {
        if (!url.match(/^[./]/)) {
          return next(url, context)
        }

        let path = new URL(url, context.parentURL).href

        if (path.startsWith(this.base)) {

          if (context.parentURL?.startsWith(this.base)) {
            const depending = context.parentURL.slice(this.base.length).replace(/\?ver=\d+$/, '')
            const depended = path.slice(this.base.length)
            this.#addDep(depending, depended)
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

        }

        return next(url, context)
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

          if (tsx || jsx) {
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

const defaultSwcTransformJsx = makeSwcTransformJsx(treeRoot => treeRoot + '/jsx-node.ts')

export function makeSwcTransformJsx(jsxImportSource: (...args: Parameters<JsxTransformer>) => string): JsxTransformer {
  const uuid = randomUUID()
  return (treeRoot, filename, src, tsx) => {
    const result = swc.transformSync(src, {
      filename,
      isModule: true,
      sourceMaps: 'inline',
      jsc: {
        keepClassNames: true,
        target: 'esnext',
        parser: tsx
          ? { syntax: 'typescript', tsx: true, decorators: true }
          : { syntax: 'ecmascript', jsx: true, decorators: true },
        transform: {
          react: {
            runtime: 'automatic',
            importSource: uuid,
          },
        },
      },
    })
    const oldJsxImport = uuid + '/jsx-runtime'
    const newJsxImport = jsxImportSource(treeRoot, filename, src, tsx)
    return result.code.replace(oldJsxImport, newJsxImport)
  }
}
