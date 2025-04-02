import * as swc from '@swc/core'
import { randomUUID } from "crypto"
import type { JsxTransformer } from "./livetree.js"

export function makeModuleJsxTransformer(jsxImportSource: (...args: Parameters<JsxTransformer>) => string): JsxTransformer {
  return (treeRoot, filename, src, tsx) => {
    const result = compileWithSwc(src, opts => {
      opts.filename = filename
      opts.jsc ??= {}
      opts.jsc.parser = tsx
        ? { syntax: 'typescript', tsx: true, decorators: true }
        : { syntax: 'ecmascript', jsx: true, decorators: true }
      opts.jsc ??= {}
      opts.jsc.transform ??= {}
      opts.jsc.transform.react ??= {}
      opts.jsc.transform.react.importSource = jsxImportSource(treeRoot, filename, src, tsx)
    })
    return result.code
  }
}

export const transformModuleJsxToRootJsx = makeModuleJsxTransformer(treeRoot => treeRoot + '/jsx-node.ts')
export const transformModuleJsxToStrings = makeModuleJsxTransformer(() => 'immaculata/dist/jsx-strings.js')

export function compileWithSwc(src: string, modifyOpts?: (opts: swc.Options) => void) {
  const opts: swc.Options = {
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
  modifyOpts?.(opts)

  let fixJsxImport
  if (opts.jsc?.transform?.react?.importSource) {
    const uuid = randomUUID()
    const fakeImport = `${uuid}/jsx-runtime`
    const realImport = opts.jsc.transform.react.importSource
    opts.jsc.transform.react.importSource = uuid
    fixJsxImport = (code: string) => code.replace(fakeImport, realImport)
  }

  const result = swc.transformSync(src, opts)
  if (fixJsxImport) result.code = fixJsxImport(result.code)
  return result
}
