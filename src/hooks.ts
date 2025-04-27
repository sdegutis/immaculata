import { readFileSync } from "fs"
import type { registerHooks } from "module"
import { fileURLToPath } from "url"

export const tryTsTsxJsxModuleHook: Parameters<typeof registerHooks>[0] = {

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

export function compileJsxTsxModuleHook(fn: (src: string, url: string) => string): Parameters<typeof registerHooks>[0] {
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

export function jsxRuntimeModuleHook(jsx: string): Parameters<typeof registerHooks>[0] {
  return {
    resolve: (spec, ctx, next) => {
      if (spec.endsWith('/jsx-runtime')) spec = jsx
      return next(spec, ctx)
    }
  }
}
