import * as swc from '@swc/core'
import { registerHooks } from 'module'
import { dirname, relative } from "path/posix"
import { LiveTree } from "./livetree.ts"

const tree = new LiveTree('site', import.meta.url)


registerHooks({

  resolve: (url, context, next) => {
    let path = new URL(url, context.parentURL).href

    if (path.startsWith(tree.base)) {

      if (context.parentURL?.startsWith(tree.base)) {
        const depending = context.parentURL.slice(tree.base.length).replace(/\?ver=\d+$/, '')
        const depended = path.slice(tree.base.length)
        tree.addDep(depending, depended)
      }

      const rel = '/' + relative(tree.base, path)
      const found = (
        tree.files.get(rel) ??
        tree.files.get(rel + '.ts') ??
        tree.files.get(rel + '.tsx') ??
        tree.files.get(rel + '.jsx'))

      if (!found) {
        return next(url, context)
      }

      const newurl = new URL('.' + found.path, tree.base + '/')
      newurl.search = `ver=${found.version}`

      return {
        url: newurl.href,
        shortCircuit: true,
      }

    }

    return next(url, context)
  },

  load: (url, context, next) => {
    if (url.startsWith(tree.base)) {
      url = url.replace(/\?ver=\d+$/, '')

      const path = url.slice(tree.base.length)
      const found = tree.files.get(path)

      if (!found) {
        return next(url, context)
      }

      const tsx = path.endsWith('.tsx')
      const jsx = path.endsWith('.jsx')

      if (tsx || jsx) {
        const toRoot = relative(dirname(url), tree.base) || '.'
        const output = transform(found.content.toString(), tsx, toRoot)
        return {
          format: 'module',
          shortCircuit: true,
          source: output,
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

tree.watch({}, async (paths) => {
  console.log('paths changed', paths)


  await import('./site/test1.tsx')
  await import('./site/test1.tsx')
  await import('./site/test1.tsx')

})



console.log('in main')

await import('./site/test1.tsx')
await import('./site/test1.tsx')
await import('./site/test1.tsx')



function transform(src: string, tsx: boolean, importSourceSiteBase: string) {
  return swc.transformSync(src, {
    isModule: true,
    jsc: {
      parser: tsx
        ? { syntax: 'typescript', tsx: true }
        : { syntax: 'ecmascript', jsx: true },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: importSourceSiteBase,
        },
      },
    },
  }).code
}
