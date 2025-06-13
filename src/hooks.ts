import { readFileSync } from "fs"
import type { RegisterHooksOptions } from "module"
import { fileURLToPath } from "url"

function extRegex(ext: string) {
  const re = new RegExp(`\\.${ext}(\\?|$)`)
  return (url: string) => url.match(re)
}

type StringExportOptions =
  | { bareExt: string }
  | { should: (url: string) => boolean }

export function exportAsString(opts: StringExportOptions): RegisterHooksOptions {
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

export const tryAltExts: RegisterHooksOptions = {

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

export function compileJsx(fn: (src: string, url: string) => string): RegisterHooksOptions {
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

export function mapImport(from: string, to: string): RegisterHooksOptions {
  return {
    resolve: (spec, ctx, next) => {
      if (spec === from) spec = to
      return next(spec, ctx)
    }
  }
}
