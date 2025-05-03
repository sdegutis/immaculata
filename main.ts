import { transformSync } from '@swc/core'
import { compileJsxTsxModuleHook, FileTree, jsxRuntimeModuleHook, tryTsTsxJsxModuleHook } from 'immaculata'
import { registerHooks } from 'module'

const tree = new FileTree('.', import.meta.url, {
  exclude: (path) => {
    if (path.includes('/.git/')) return true
    if (path.includes('/node_modules/')) return true

    return false
  }
})
tree.files.keys().forEach(k => console.log('key: ', k))

tree.watch({}, (paths) => {
  console.log('')
  console.log('changed')
  // paths.values().forEach(f => console.log('  ', f.change, f.path))

  // tree.files.keys().forEach(k => console.log('key2: ', k))
  import('./site/a.js')
})

registerHooks(tree.enableImportsModuleHook())
registerHooks(tryTsTsxJsxModuleHook)
registerHooks(jsxRuntimeModuleHook(tree.root + '/site/reactlike.ts'))
// registerHooks(jsxRuntimeModuleHook('immaculata/dist/jsx-strings.js'))
registerHooks(compileJsxTsxModuleHook((source, url) => {
  return transformSync(source, {
    isModule: true,
    sourceMaps: 'inline',
    jsc: {
      keepClassNames: true,
      target: 'esnext',
      parser: url.match(/\.tsx(\?|$)/)
        ? { syntax: 'typescript', tsx: true, decorators: true }
        : { syntax: 'ecmascript', jsx: true, decorators: true },
      transform: {
        react: { runtime: 'automatic', },
      },
    },
  }).code
}))

import('./site/a.js')
