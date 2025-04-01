import * as immaculata from "immaculata"
import { createRequire } from "module"

immaculata.generateFiles

const require = createRequire(import.meta.url)

const server = new immaculata.DevServer(8080, '/hmr')
const tree = new immaculata.LiveTree('site', import.meta.url)

tree.enableModules(immaculata.makeSwcTransformJsx(() => 'immaculata/jsx-strings.ts'))
// tree.enableModules()

processSite()

async function processSite() {
  const isDynamicArrayFile = /\/.*(?<slug>\[.+\]).*\..+(?<ext>\.tsx?)$/
  const isDynamicFile = /\..+(?<ext>\.tsx?)$/

  // const start = Date.now()
  const map = await processFilesAsync(async files => {
    // files = files.filter(f => !f.path.endsWith('x'))
    // console.log('in here1')

    const dynamicFiles = files.map(file => ({ file, match: file.path.match(isDynamicFile) }))
    const dynamicArrayFiles = files.map(file => ({ file, match: file.path.match(isDynamicArrayFile) }))

    files = files.flatMap(f => processFile(tree, f))

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


async function processFilesAsync(fn: (files: immaculata.LiveFile[]) => Promise<immaculata.LiveFile[]>) {
  let files: immaculata.LiveFile[] = [...tree.files.values()]
  files = await fn(files)
  return new Map(files.map(f => [f.path, f.content]))
}

export function processFile(tree: immaculata.LiveTree, file: immaculata.LiveFile): immaculata.LiveFile[] {

  const out: immaculata.LiveFile[] = []

  let match
  if (match = file.path.match(isArrayFile)) {
    const exportedArray = require('.' + file.path).default as [string, any][]
    for (const [name, content] of exportedArray) {
      const filepath = file.path.replace(match.groups!["slug"]!, name)
      out.push({ path: filepath.slice(0, -match.groups!["ext"]!.length), content })
    }
  }
  else if (match = file.path.match(isSingleFile)) {
    const exportedContent = require('.' + file.path).default
    out.push({ path: file.path.slice(0, -match.groups!["ext"]!.length), content: exportedContent })
  }
  else {
    out.push(file)
  }

  return out
}
