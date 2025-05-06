import { tree } from "../tree.ts"

export const str4 = 'hi234!'

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED rimpl')
})
