import type { registerHooks } from "module"

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
