import * as swc from '@swc/core'
import { registerHooks } from 'module'
import { dirname, relative } from "path/posix"
import { LiveTree } from "./livetree.ts"

const tree = new LiveTree()
tree.loadTree()

const siteBase = new URL(tree.siteDir, import.meta.url).href




registerHooks({

  resolve: (url, context, next) => {
    const path = new URL(url, context.parentURL).href

    if (path.startsWith(siteBase)) {

      if (context.parentURL.startsWith(siteBase)) {
        const depending = context.parentURL.slice(siteBase.length)
        const depended = path.slice(siteBase.length)
        tree.addDep(depending, depended)
      }

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

      const tsx = path.endsWith('.tsx')
      const jsx = path.endsWith('.jsx')

      if (tsx || jsx) {
        const toRoot = relative(dirname(url), siteBase) || '.'

        const output = swc.transformSync(
          found.content.toString(),
          swcopts(tsx, toRoot))

        return {
          format: 'module',
          shortCircuit: true,
          source: output.code,
        }
      }

      return {
        format: path.match(/\.tsx?$/) ? 'module-typescript' : 'module',
        shortCircuit: true,
        source: found.content,
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
