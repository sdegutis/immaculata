import * as immaculata from "immaculata"

const server = new immaculata.DevServer(8080)
const tree = new immaculata.LiveTree('site', import.meta.url)

tree.enableModules(immaculata.transformModuleJsxToStrings)

processSite()




async function processSite() {

  const map = await tree.processFiles(async files => {

    const r = /\..+(?<ext>\.tsx?)$/
    await files.with(r).doAsync(async (file) => {
      const match = file.path.match(r)!
      const exports = await import('./site' + file.path)

      file.path = file.path.slice(0, -match.groups!["ext"]!.length)
      file.text = exports.default
      // console.log([file.path])
    })

    files.with('\.tsx?$').do(f => {
      f.text = immaculata.compileWithSwc(f.text, opts => {

        opts.jsc ??= {}
        opts.jsc.transform ??= {}
        opts.jsc.transform.react ??= {}
        opts.jsc.transform.react.importSource = '/foo/bar.js'

        // delete opts.jsc.transform.react

      }).code
      f.path = f.path.replace(/\.tsx?$/, '.js')
    })

  })

  server.files = map
  // immaculata.generateFiles(map, true)
}

tree.watch({}, async (paths) => {
  console.log(' ')
  console.log('paths changed', paths)
  processSite()
  server.reload()
})

console.log(' ')
console.log('in main')
