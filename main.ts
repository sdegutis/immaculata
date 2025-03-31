import * as immaculata from "immaculata"

const tree = new immaculata.LiveTree('site', import.meta.url)

// const tsx = immaculata.makeSwcTransformJsx(() => 'immaculata/src/jsx-strings.ts')
const tsx = immaculata.makeSwcTransformJsx(root => root + '/jsx-runtime.ts')

tree.enableModules(tsx)

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
