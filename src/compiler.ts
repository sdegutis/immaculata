import * as babel from '@babel/core'
import * as module from 'node:module'
import { convertTsExts } from './file.ts'

const require = module.Module.createRequire(import.meta.url)

export class Compiler {

  jsxPathNode
  jsxPathBrowser

  constructor(
    jsxPathNode: string,
    jsxPathBrowser: string,
  ) {
    this.jsxPathNode = jsxPathNode
    this.jsxPathBrowser = jsxPathBrowser
  }

  compile(code: string, realFilePath?: string, browserFilePath?: string) {
    const imports = new Set<string>()
    return {
      code: babel.transformSync(code, {
        filename: realFilePath ?? browserFilePath,
        sourceMaps: 'inline',
        plugins: [
          ...(realFilePath ? [require('@babel/plugin-transform-modules-commonjs')] : []),
          [require('@babel/plugin-transform-typescript'), { isTSX: true }],
          [require('@babel/plugin-syntax-import-attributes')],
          [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic', importSource: '/@imlib', throwIfNamespace: false }],
          this.#collectImports(!!browserFilePath, imports),
        ],
      })!.code!,
      imports,
    }
  }

  #collectImports(inBrowser: boolean, imports: Set<string>): babel.PluginItem {
    return {
      visitor: {
        ImportDeclaration: {
          enter: (path) => {
            const dep = path.node.source?.value
            if (!dep) return

            if (dep === '/@imlib/jsx-runtime') {
              path.node.source.value = (inBrowser
                ? convertTsExts(this.jsxPathBrowser)
                : convertTsExts(this.jsxPathNode))
            }
            else {
              imports.add(dep)
            }
          },
        }
      }
    }
  }

}
