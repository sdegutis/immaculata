import { readFileSync } from "fs"
import type { registerHooks } from "module"
import { fileURLToPath } from "url"

// Can't remove until
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/72580#pullrequestreview-2804640092
// is addressed
declare module "module" {
  export function registerHooks(opts: {
    load?: (url: string, context: LoadHookContext, nextLoad: (url: string, context?: Partial<LoadHookContext>) => LoadFnOutput) => LoadFnOutput,
    resolve?: (specifier: string, context: ResolveHookContext, nextResolve: (specifier: string, context?: Partial<ResolveHookContext>) => ResolveFnOutput) => ResolveFnOutput,
  }): void
}

type ModuleHook = Parameters<typeof registerHooks>[0]

function extRegex(ext: string) {
  const re = new RegExp(`\\.${ext}(\\?|$)`)
  return (url: string) => url.match(re)
}

type StringExportOptions =
  | { bareExt: string }
  | { should: (url: string) => boolean }

export function exportAsStringModuleHook(opts: StringExportOptions): ModuleHook {
  const should = 'should' in opts ? opts.should : extRegex(opts.bareExt)
  return {
    load(url, context, nextLoad) {
      const module = nextLoad(url, context)
      if (should(url)) {
        const src = JSON.stringify(module.source?.toString())
        module.source = `export default ${src}`
      }
      return module
    },
  }
}

export const tryTsTsxJsxModuleHook: ModuleHook = {

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

}

export function compileJsxTsxModuleHook(fn: (src: string, url: string) => string): ModuleHook {
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

      return {
        source: fn(source, url),
        format: 'module',
        shortCircuit: true,
      }
    }

  }
}

export function jsxRuntimeModuleHook(jsx: string): ModuleHook {
  return {
    resolve: (spec, ctx, next) => {
      if (spec.endsWith('/jsx-runtime')) spec = jsx
      return next(spec, ctx)
    }
  }
}
