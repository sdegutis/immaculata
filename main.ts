import * as immaculata from "immaculata"

const server = new immaculata.DevServer(8080, '/hmr')

const tree = new immaculata.LiveTree('site', import.meta.url)

processSite()

function processSite() {
  const map = tree.processFiles(files => {
    files = files.filter(f => !f.path.endsWith('x'))
    return files
  })
  server.files = map
  immaculata.generateFiles(map, true)
}

tree.watch({}, async (paths) => {
  console.log('paths changed', paths)
  server.reload()
  processSite()
})

console.log('in main')
