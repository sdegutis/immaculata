import { tree } from "../tree.ts"

export const b: number = 2344
console.log('in b', b, <foo bar={2} />)

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED b')
})
