import { transformSync } from '@swc/core'
import { compileJsxTsxModuleHook, LiveTree, tryTsTsxJsxModuleHook } from 'immaculata'
import { registerHooks } from 'module'

const tree = new LiveTree('site', import.meta.url)

tree.watch({}, () => {
  console.log('')
  console.log('changed')
  import('./site/a.js')
})

registerHooks(tree.moduleHook())
registerHooks(tryTsTsxJsxModuleHook)

function jsxRuntimeModuleHook(jsx: string): Parameters<typeof registerHooks>[0] {
  return {
    resolve: (spec, ctx, next) => {
      if (spec.endsWith('/jsx-runtime')) spec = jsx
      return next(spec, ctx)
    }
  }
}

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
        react: {
          runtime: 'automatic',
          importSource: tree.base,
        },
      },
    },
  }).code
}))

import('./site/a.js')
