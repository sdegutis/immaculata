import * as immaculata from "immaculata"

const server = new immaculata.DevServer(8080, '/hmr')

const tree = new immaculata.LiveTree('site', import.meta.url)

function processSite() {

  const files = tree.files.values().toArray()

  const map = new Map(files.map(f => [f.path, f.content]))

  server.files = map

}

tree.watch({}, async (paths) => {
  console.log('paths changed', paths)
  server.reload()
  processSite()
})

console.log('in main')
