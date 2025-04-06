import { transformSync } from '@swc/core'
import { compileJsxTsxModuleHook, jsxRuntimeModuleHook, LiveTree, tryTsTsxJsxModuleHook } from 'immaculata'
import { registerHooks } from 'module'

const tree = new LiveTree('site', import.meta.url)

tree.watch({}, () => {
  console.log('')
  console.log('changed')
  import('./site/a.js')
})

registerHooks(tree.moduleHook())
registerHooks(tryTsTsxJsxModuleHook)
registerHooks(jsxRuntimeModuleHook('immaculata/dist/jsx-strings.js'))
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
