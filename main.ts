import { hooks } from 'immaculata'
import { tryAltExts } from 'immaculata/hooks.js'
import { registerHooks } from 'module'
import ts from 'typescript'
import { fileURLToPath } from 'url'
import { tree } from './tree.ts'

tree.files.keys().forEach(k => console.log('key: ', k))

tree.watch().on('moduleInvalidated', path => {
  console.log('moduleInvalidated', path)
})

tree.watch().on('filesUpdated', () => {
  import('./site/a.js')
})

registerHooks(hooks.useTree(tree))

registerHooks(hooks.mapImport(
  'react/jsx-runtime',
  tree.root + '/myreact.ts'))

// registerHooks(hooks.mapImport(
//   'react/jsx-runtime',
//   'immaculata/jsx-strings.js'))

registerHooks(tryAltExts)

registerHooks(hooks.compileJsx((str, url) => {
  return ts.transpileModule(str, {
    fileName: fileURLToPath(url),
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
      inlineSourceMap: true,
      inlineSources: true,
    }
  }).outputText
}))

import('./site/a.js')
