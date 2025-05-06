import { tree } from "../tree.ts"

export const inc = 3
console.log('in c')

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED c')
})
