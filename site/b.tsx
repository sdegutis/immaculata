import { tree } from "../tree.ts"
import { inc } from "./c.ts"

export const b: number = 2344
console.log('in b', b, inc, <foo bar={2} />)

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED b')
})
