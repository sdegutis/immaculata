import * as babel from '@babel/core'
import { readFileSync } from 'fs'

export class Compiler {

  packageJson = JSON.parse(readFileSync('package.json').toString('utf8'));

  compile(code: string, realFilePath?: string, browserFilePath?: string) {
    const imports = new Set<string>()
    return {
      code: babel.transformSync(code, {
        filename: realFilePath ?? browserFilePath,
        plugins: [
          ...(realFilePath ? [require('@babel/plugin-transform-modules-commonjs')] : []),
          [require('@babel/plugin-transform-typescript'), { isTSX: true }],
          [require('@babel/plugin-syntax-import-attributes')],
          [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic', importSource: '/@imlib', throwIfNamespace: false }],
          collectImports(!!browserFilePath, imports),
        ],
      })!.code!,
      imports,
    }
  }

}

function collectImports(inBrowser: boolean, imports: Set<string>): babel.PluginItem {
  return {
    visitor: {
      ImportDeclaration: {
        enter: (path) => {
          const dep = path.node.source?.value
          if (!dep) return

          if (dep === '/@imlib/jsx-runtime') {
            path.node.source.value = (inBrowser ? '/@imlib/jsx-browser.js' : '/@imlib/jsx-node.js')
          }
          else {
            imports.add(dep)
          }
        },
      }
    }
  }
}
