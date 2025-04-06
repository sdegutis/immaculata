import { LiveTree } from 'immaculata'
import { registerHooks } from 'module'

const tree = new LiveTree('site', import.meta.url)
const treeroot = new URL('site', import.meta.url).href

declare module "module" {
  export function registerHooks(opts: {
    load?: LoadHook,
    resolve?: ResolveHook,
  }): void
}

registerHooks({
  resolve: (spec, ctx, next) => {
    const url = new URL(spec, ctx.parentURL).href
    if (url.startsWith(treeroot)) {
      return { url, shortCircuit: true }
    }
    return next(spec, ctx)
  },
})

registerHooks({
  load: (url, context, next) => {
    if (url.startsWith(treeroot)) {
      const path = url.slice(treeroot.length)
      const found = (
        tree.files.get(path) ??
        tree.files.get(path.replace(/\.js$/, '.ts')) ??
        tree.files.get(path.replace(/\.js$/, '.tsx'))
      )
      return {
        shortCircuit: true,
        format: 'module-typescript',
        source: found!.content,
      }
    }
    return next(url, context)
  }
})

// registerHooks({

//   load: (url, context, next) => {

//     // url = url.replace(/\.tsx?$/, '.js')

//     const other = next(url, context)
//     console.log(other)

//     return {
//       format: 'module-typescript',
//       shortCircuit: true,
//       source: `export const a = 1234; console.log('in fake a')`,
//     }
//     // return next(url, context)
//   }

// })

import('./site/a.js')
