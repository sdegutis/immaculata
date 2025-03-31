import * as swc from '@swc/core'
import { registerHooks } from 'module'
import { dirname, relative } from "path/posix"
import { LiveTree } from "./livetree.ts"

const tree = new LiveTree()
tree.loadTree()

// console.log(tree.files)

const siteBase = new URL(tree.siteDir, import.meta.url).href



registerHooks({

  resolve: (url, context, next) => {
    const path = new URL(url, context.parentURL).href

    // console.log('resolve1', [url])
    // console.log('resolve2', [absPath])
    // console.log('resolve3', [siteBase])

    if (path.startsWith(siteBase)) {
      const rel = '/' + relative(siteBase, path)
      // console.log('resolve4', [rel])

      const found = (
        tree.files.get(rel) ??
        tree.files.get(rel + '.ts') ??
        tree.files.get(rel + '.tsx') ??
        tree.files.get(rel + '.js'))

      // console.log(1, [rel])
      // console.log(1, [siteBase])
      // console.log(2, [absPath])
      // console.log(2, [!!found])

      return {
        url: new URL('.' + found.path, siteBase + '/').href,
        shortCircuit: true,
      }
    }

    return next(url, context)
  },

  load: (url, context, next) => {
    // console.log('load', [url])

    if (url.startsWith(siteBase)) {
      const path = url.slice(siteBase.length)
      const found = tree.files.get(path)

      // console.log([!!found])

      const tsx = path.endsWith('.tsx')
      const jsx = path.endsWith('.jsx')

      if (tsx || jsx) {
        // console.log('in here 1', [path.dirname(url)])
        // console.log('in here 2', [siteBase])

        const toRoot = relative(dirname(url), siteBase) || '.'
        // console.log('in here 2', [toRoot])

        const output = swc.transformSync(
          found.content.toString(),
          swcopts(tsx, toRoot))

        // console.log(output.code)

        return {
          format: 'module',
          shortCircuit: true,
          source: output.code,
        }
      }

      return {
        format: path.endsWith('.ts') ? 'module-typescript' : 'module',
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
