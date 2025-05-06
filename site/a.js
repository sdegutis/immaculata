import { tree } from "../tree.ts"
import { b } from "./b.js"
import { inc } from "./c.ts"

export const a = 123
console.log('in a', a, b, inc)


tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED a')
})
