import { tree } from "../tree.ts"

export const str4 = 'jsx:'

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED rimpl')
})
