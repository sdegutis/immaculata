import * as immaculata from "immaculata"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

const server = new immaculata.DevServer(8080, '/hmr')
const tree = new immaculata.LiveTree('site', import.meta.url)

tree.enableModules(immaculata.makeSwcTransformJsx(() => 'immaculata/jsx-strings.ts'))
// tree.enableModules()

processSite()

function processSite() {
  const start = Date.now()
  const map = tree.processFiles(files => {
    // files = files.filter(f => !f.path.endsWith('x'))
    // console.log('in here1')

    files = files.flatMap(f => immaculata.processFile(tree, f))

    // require('./site/test1.tsx')
    // console.log('in here2')
    return files
  })
  // console.log(`Time: ${Date.now() - start} ms`)
  server.files = map
  immaculata.generateFiles(map, true)
}

tree.watch({}, async (paths) => {
  console.log(' ')
  console.log('paths changed', paths)
  processSite()
  server.reload()
})

console.log(' ')
console.log('in main')
