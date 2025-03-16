import * as babel from '@babel/core';
import { readFileSync } from 'fs';
import { babelPluginVanillaJSX } from './vanillajsx.js';

export class Compiler {

  packageJson = JSON.parse(readFileSync('package.json').toString('utf8'));

  compile(code: string, realFilePath?: string, browserFilePath?: string) {
    const imports = new Set<string>();
    return {
      code: babel.transformSync(code, {
        filename: realFilePath ?? browserFilePath,
        plugins: [
          ...(realFilePath ? [require('@babel/plugin-transform-modules-commonjs')] : []),
          [require('@babel/plugin-transform-typescript'), { isTSX: true }],
          [require('@babel/plugin-syntax-import-attributes')],
          babelPluginVanillaJSX,
          collectImports(imports),
        ],
      })!.code!,
      imports,
    };
  }

}

function collectImports(imports: Set<string>): babel.PluginItem {
  return {
    visitor: {
      ImportDeclaration: {
        enter: (path) => {
          if (path.node.source?.value) {
            imports.add(path.node.source.value)
          }
        },
      }
    }
  }
}
