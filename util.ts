import * as swc from '@swc/core'
import { randomUUID } from "crypto"
import type { JsxTransformer } from "./livetree.ts"

export function makeSwcTransformJsx(jsxImportSource: (...args: Parameters<JsxTransformer>) => string): JsxTransformer {
  const uuid = randomUUID()
  return (treeRoot, filename, src, tsx) => {
    const result = swc.transformSync(src, {
      filename,
      isModule: true,
      sourceMaps: 'inline',
      jsc: {
        keepClassNames: true,
        target: 'esnext',
        parser: tsx
          ? { syntax: 'typescript', tsx: true, decorators: true }
          : { syntax: 'ecmascript', jsx: true, decorators: true },
        transform: {
          react: {
            runtime: 'automatic',
            importSource: uuid,
          },
        },
      },
    })
    const oldJsxImport = `${uuid}/jsx-runtime`
    const newJsxImport = jsxImportSource(treeRoot, filename, src, tsx)
    return result.code.replace(oldJsxImport, newJsxImport)
  }
}

export const transformJsxToRootJsx = makeSwcTransformJsx(treeRoot => treeRoot + '/jsx-node.ts')
export const transformJsxToStrings = makeSwcTransformJsx(() => 'immaculata/jsx-strings.ts')
