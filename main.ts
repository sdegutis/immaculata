import * as swc from '@swc/core'
import { type LoadFnOutput, registerHooks } from 'module'
import { dirname, relative } from "path/posix"
import { LiveTree } from "./livetree.ts"

const tree = new LiveTree()
tree.loadTree()

const siteBase = new URL(tree.siteDir, import.meta.url).href




registerHooks({

  resolve: (url, context, next) => {
    const path = new URL(url, context.parentURL).href
    if (path.startsWith(siteBase)) {
      const rel = '/' + relative(siteBase, path)
      const found = (
        tree.files.get(rel) ??
        tree.files.get(rel + '.ts') ??
        tree.files.get(rel + '.tsx') ??
        tree.files.get(rel + '.js'))
      return {
        url: new URL('.' + found.path, siteBase + '/').href,
        shortCircuit: true,
      }
    }
    return next(url, context)
  },

  load: (url, context, next) => {
    if (url.startsWith(siteBase)) {
      const path = url.slice(siteBase.length)
      const found = tree.files.get(path)
      return {
        format: path.match(/\.tsx?$/) ? 'module-typescript' : 'module',
        shortCircuit: true,
        source: found.content,
      }
    }
    return next(url, context)
  }

})

registerHooks({

  load: (url, context, next) => {
    const tsx = url.endsWith('.tsx')
    const jsx = url.endsWith('.jsx')

    if (tsx || jsx) {
      const found = next(url, context) as LoadFnOutput
      const toRoot = relative(dirname(url), siteBase) || '.'

      const output = swc.transformSync(
        found.source.toString(),
        swcopts(tsx, toRoot))

      return {
        format: 'module',
        shortCircuit: true,
        source: output.code,
      }
    }

    return next(url, context)
  }

})

console.log('in main')

await import('./site/test1.tsx')
await import('./site/test1.tsx')
await import('./site/test1.tsx')



function swcopts(tsx: boolean, toRoot: string): swc.Options {
  return {
    isModule: true,
    jsc: {
      parser: tsx
        ? { syntax: 'typescript', tsx: true }
        : { syntax: 'ecmascript', jsx: true },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: toRoot,
        },
      },
    },
  }
}
