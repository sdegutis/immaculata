import { transformSync, type Options } from '@swc/core'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { LiveTree } from 'immaculata'
import { registerHooks } from 'module'
import { fileURLToPath } from 'url'

const tree = new LiveTree('site', import.meta.url)

type Fix<T> =
  T extends (a: infer A, b: infer B, next: (...args: infer I) => infer O) => infer R
  ? (a: A, b: B, next: (...args: I) => Awaited<O>) => Awaited<R>
  : T

declare module "module" {
  export function registerHooks(opts: {
    load?: Fix<LoadHook>,
    resolve?: Fix<ResolveHook>,
  }): void
}

// registerHooks({
//   load: (url, context, next) => {
//     if (url.startsWith(tree.base)) {
//       const path = url.slice(tree.base.length)
//       const found = tree.files.get(path)
//       if (!found) return next(url, context)

//       const hasTypes = found.path.match(/\.tsx?$/)
//       if (found.path.endsWith('x')) context.format = hasTypes ? 'tsx' : 'jsx'

//       console.log('loading from tree')
//       return {
//         shortCircuit: true,
//         format: hasTypes ? 'module-typescript' : 'module',
//         source: found.content,
//       }
//     }
//     return next(url, context)
//   }
// })

registerHooks({
  resolve: (spec, ctx, next) => {
    try { return next(spec, ctx) }
    catch {
      try { return next(spec.replace(/\.js$/, '.ts'), ctx) }
      catch {
        try { return next(spec.replace(/\.js$/, '.tsx'), ctx) }
        catch {
          return next(spec.replace(/\.js$/, '.jsx'), ctx)
        }
      }
    }
  },
})

registerHooks({
  load: (url, context, next) => {
    const istsx = url.endsWith('.tsx')
    const isjsx = url.endsWith('.jsx')

    let result: ReturnType<typeof next>
    try { result = next(url, context) }
    catch (e) {
      result = {
        source: readFileSync(fileURLToPath(url), 'utf8'),
        format: 'module',
        shortCircuit: true,
      }
    }

    if (istsx || isjsx) {

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

      let source = transformSync(result.source!.toString(), opts)
      if (fixJsxImport) source.code = fixJsxImport(source.code)
      return { ...result, source: source.code, format: 'module' }
    }
    return result
  }
})

import('./site/a.js')
