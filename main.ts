import * as swc from '@swc/core'
import * as chokidar from 'chokidar'
import { registerHooks } from 'module'
import * as path from 'path'
import { dirname, relative } from "path/posix"
import { LiveTree } from "./livetree.ts"

const tree = new LiveTree()
tree.loadTree()

const siteBase = new URL(tree.root, import.meta.url).href




registerHooks({

  resolve: (url, context, next) => {
    let path = new URL(url, context.parentURL).href

    if (path.startsWith(siteBase)) {

      if (context.parentURL.startsWith(siteBase)) {
        const depending = context.parentURL.slice(siteBase.length).replace(/\?ver=\d+$/, '')
        const depended = path.slice(siteBase.length)
        tree.addDep(depending, depended)
      }

      const rel = '/' + relative(siteBase, path)
      const found = (
        tree.files.get(rel) ??
        tree.files.get(rel + '.ts') ??
        tree.files.get(rel + '.tsx') ??
        tree.files.get(rel + '.jsx'))

      const newurl = new URL('.' + found.path, siteBase + '/')
      newurl.search = `ver=${found.version}`

      return {
        url: newurl.href,
        shortCircuit: true,
      }

    }

    return next(url, context)
  },

  load: (url, context, next) => {
    if (url.startsWith(siteBase)) {
      url = url.replace(/\?ver=\d+$/, '')

      const path = url.slice(siteBase.length)
      const found = tree.files.get(path)

      const tsx = path.endsWith('.tsx')
      const jsx = path.endsWith('.jsx')

      if (tsx || jsx) {
        const toRoot = relative(dirname(url), siteBase) || '.'
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




const updatedPaths = new Set<string>()
let reloadFsTimer: NodeJS.Timeout

const pathUpdated = (filePath: string) => {
  updatedPaths.add(filePath.split(path.sep).join(path.posix.sep))
  clearTimeout(reloadFsTimer)
  reloadFsTimer = setTimeout(async () => {
    console.log(' ')
    console.log('Updated:', [...updatedPaths].map(p => '\n  ' + p).join(''))
    console.log('Rebuilding site...')

    try {
      tree.pathsUpdated(...updatedPaths)

      // const outfiles = runtime.process()
      // server.files = outfiles

      await import('./site/test1.tsx')
      await import('./site/test1.tsx')
      await import('./site/test1.tsx')

      updatedPaths.clear()
      // server.events.dispatchEvent(new Event('rebuilt'))
    }
    catch (e) {
      console.error(e)
    }

    console.log('Done.')
  }, 100)
}

const opts: chokidar.ChokidarOptions = {
  ignoreInitial: true,
  cwd: process.cwd(),
}

chokidar.watch(tree.root, opts)
  .on('add', pathUpdated)
  .on('change', pathUpdated)
  .on('unlink', pathUpdated)

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
