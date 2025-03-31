import { LiveTree } from "./livetree.ts"

const tree = new LiveTree('site', import.meta.url)
tree.enableModules()
tree.watch({}, async (paths) => {
  console.log('paths changed', paths)


  await import('./site/test1.tsx')
  await import('./site/test1.tsx')
  await import('./site/test1.tsx')

})

console.log('in main')

await import('./site/test1.tsx')
await import('./site/test1.tsx')
await import('./site/test1.tsx')
