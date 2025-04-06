import { transformSync, type Options } from '@swc/core'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { LiveTree } from 'immaculata'
import { registerHooks } from 'module'
import { relative } from 'path/posix'
import { fileURLToPath } from 'url'

const tree = new LiveTree('site', import.meta.url)

registerHooks({

  resolve: (spec, context, next) => {
    if (!spec.match(/^(\.|\/|file:\/\/\/)/)) return next(spec, context)

    let path = new URL(spec, context.parentURL).href
    if (!path.startsWith(tree.base)) return next(spec, context)

    const found = tree.files.get('/' + relative(tree.base, path))
    if (!found) return next(spec, context)

    if (context.parentURL?.startsWith(tree.base) && !context.parentURL.endsWith('/noop.js')) {
      const depending = context.parentURL.slice(tree.base.length).replace(/\?ver=\d+$/, '')
      const depended = path.slice(tree.base.length)
      tree.addDep(depending, depended)
    }

    const newurl = new URL('.' + found.path, tree.base + '/')
    newurl.search = `ver=${found.version}`

    return { url: newurl.href, shortCircuit: true }
  },

  load: (url, context, next) => {
    if (url.startsWith(tree.base)) {
      url = url.replace(/\?ver=\d+$/, '')

      const path = url.slice(tree.base.length)
      const found = tree.files.get(path)
      if (!found) return next(url, context)

      // console.log('loading from tree')
      return {
        shortCircuit: true,
        format: found.path.match(/\.tsx?$/) ? 'module-typescript' : 'module',
        source: found.content,
      }
    }
    return next(url, context)
  }
})

registerHooks({
  resolve: (spec, ctx, next) => {
    const trySpec = (spec: string) => {
      try { return next(spec, ctx) }
      catch (e: any) {
        if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e
        return null
      }
    }
    return (
      trySpec(spec) ??
      trySpec(spec.replace(/\.js(\?|$)/, '.ts$1')) ??
      trySpec(spec.replace(/\.js(\?|$)/, '.tsx$1')) ??
      trySpec(spec.replace(/\.js(\?|$)/, '.jsx$1')) ??
      next(spec, ctx)
    )
  },
})

registerHooks({
  load: (url, context, next) => {
    const istsx = url.match(/\.tsx\??/)
    const isjsx = url.match(/\.jsx\??/)
    if (!isjsx && !istsx) return next(url, context)

    let source: string
    try { source = next(url, context).source!.toString() }
    catch (e: any) {
      if (e.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw e
      source = readFileSync(fileURLToPath(url), 'utf8')
    }

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
    opts.jsc.parser = istsx
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
    return { source, format: 'module', shortCircuit: true }
  }
})

import('./site/a.js')
