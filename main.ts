import { hooks } from 'immaculata'
import { tryAltExts } from 'immaculata/hooks.js'
import { registerHooks } from 'module'
import ts from 'typescript'
import { fileURLToPath } from 'url'
import { tree } from './tree.ts'

tree.files.keys().forEach(k => console.log('key: ', k))

// tree.onModuleInvalidated('/a.js', () => { console.log('INVALIDATED a') })
// tree.onModuleInvalidated('/b.tsx', () => { console.log('INVALIDATED a') })

tree.watch().on('moduleInvalidated', path => {
  console.log('gone', path)
})

tree.watch().on('filesUpdated', () => {

  // tree.onModuleInvalidated('/a.js', () => { console.log('INVALIDATED a') })
  // tree.onModuleInvalidated('/b.tsx', () => { console.log('INVALIDATED b') })

  import('./site/a.js')
})

tree.watch().on('filesUpdated', (changes) => { console.log('changes1', changes) })
tree.watch().on('filesUpdated', (changes) => { console.log('changes2', changes) })

registerHooks(hooks.useTree(tree))

registerHooks(hooks.mapImport(
  'react/jsx-runtime',
  tree.root + '/myreact.ts'))

registerHooks(hooks.mapImport(
  'react/jsx-runtime',
  'immaculata/jsx-strings.js'))

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

