import { transformSync, type Options } from '@swc/core'
import { randomUUID } from 'crypto'
import { LiveTree } from 'immaculata'
import { registerHooks, type LoadFnOutput } from 'module'

const tree = new LiveTree('site', import.meta.url)

type Fix<T> =
  // T extends (a:infer A, b:infer B, next: infer N) => infer R
  // ? T
  // : 
  T

declare module "module" {
  export function registerHooks(opts: {
    load?: LoadHook,
    resolve?: Fix<ResolveHook>,
  }): void
}

registerHooks({
  resolve: (spec, ctx, next) => {
    const url = new URL(spec, ctx.parentURL).href
    if (url.startsWith(tree.base)) {
      return { url, shortCircuit: true }
    }
    return next(spec, ctx)
  },
  load: (url, context, next) => {
    if (url.startsWith(tree.base)) {
      const path = url.slice(tree.base.length)
      const found = (
        tree.files.get(path) ??
        tree.files.get(path.replace(/\.js$/, '.ts')) ??
        tree.files.get(path.replace(/\.js$/, '.tsx'))
      )
      if (!found) return next(url, context)
      const hasTypes = found.path.match(/\.tsx?$/)
      if (found.path.endsWith('x')) context.format = hasTypes ? 'tsx' : 'jsx'
      return {
        shortCircuit: true,
        format: hasTypes ? 'module-typescript' : 'module',
        source: found.content,
      }
    }
    return next(url, context)
  }
})

registerHooks({
  load: (url, context, next) => {
    const result = next(url, context) as LoadFnOutput
    if (context.format === 'tsx' || context.format === 'jsx') {

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
      opts.jsc.parser = context.format === 'tsx'
        ? { syntax: 'typescript', tsx: true, decorators: true }
        : { syntax: 'ecmascript', jsx: true, decorators: true }
      opts.jsc ??= {}
      opts.jsc.transform ??= {}
      opts.jsc.transform.react ??= {}
      opts.jsc.transform.react.importSource = 'reactlike.js'


      let fixJsxImport
      if (opts.jsc?.transform?.react?.importSource) {
        const uuid = randomUUID()
        const fakeImport = `${uuid}/jsx-runtime`
        const realImport = opts.jsc.transform.react.importSource
        opts.jsc.transform.react.importSource = uuid
        fixJsxImport = (code: string) => code.replace(fakeImport, realImport)
      }

      let source = transformSync(result.source!.toString(), opts)
      if (fixJsxImport) source.code = fixJsxImport(source.code)
      return { ...result, source: source.code, format: 'module' }
    }
    return result
  }
})

import('./site/a.js')
