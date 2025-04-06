import { transformSync, type Options } from '@swc/core'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { LiveTree, tryTsTsxJsxModuleHook } from 'immaculata'
import { registerHooks } from 'module'
import { fileURLToPath } from 'url'

const tree = new LiveTree('site', import.meta.url)

tree.watch({}, () => {
  console.log('')
  console.log('changed')
  import('./site/a.js')
})

registerHooks(tree.moduleHook())
registerHooks(tryTsTsxJsxModuleHook)

registerHooks(compileTsxModuleHook((source, url) => {

  const opts: Options = {
    isModule: true,
    sourceMaps: 'inline',
    jsc: {
      keepClassNames: true,
      target: 'esnext',
      parser: { syntax: 'typescript', tsx: true, decorators: true },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '/jsx.js',
        },
      },
    },
  }

  opts.jsc ??= {}
  opts.jsc.parser = url.match(/\.tsx(\?|$)/)
    ? { syntax: 'typescript', tsx: true, decorators: true }
    : { syntax: 'ecmascript', jsx: true, decorators: true }
  opts.jsc ??= {}
  opts.jsc.transform ??= {}
  opts.jsc.transform.react ??= {}
  opts.jsc.transform.react.importSource = tree.base + '/reactlike.ts'


  let fixJsxImport
  if (opts.jsc?.transform?.react?.importSource) {
    const uuid = randomUUID()
    const fakeImport = `${uuid}/jsx-runtime`
    const realImport = opts.jsc.transform.react.importSource
    opts.jsc.transform.react.importSource = uuid
    fixJsxImport = (code: string) => code.replace(fakeImport, realImport)
  }

  source = transformSync(source, opts).code
  if (fixJsxImport) source = fixJsxImport(source)

  return source

}))

import('./site/a.js')


function compileTsxModuleHook(fn: (src: string, url: string) => string): Parameters<typeof registerHooks>[0] {
  return {

    load: (url, context, next) => {
      const istsx = url.match(/\.tsx(\?|$)/)
      const isjsx = url.match(/\.jsx(\?|$)/)
      if (!isjsx && !istsx) return next(url, context)

      let source: string
      try { source = next(url, context).source!.toString() }
      catch (e: any) {
        if (e.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw e
        source = readFileSync(fileURLToPath(url), 'utf8')
      }

      source = fn(source, url)

      return { source, format: 'module', shortCircuit: true }
    }

  }
}
