import { tree } from "../tree.ts"
import { str4 } from "./rimpl.ts"

export const jsx = (...args: any[]) => [str4, args]

tree.onModuleInvalidated(import.meta.url, () => {
  console.log('INVALIDATED myreact')
})
