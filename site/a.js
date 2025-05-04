import { tree } from "../tree.ts"
import { b } from "./b.js"

export const a = 123
console.log('in a', a, b)


tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED a')
})
