# Simple build tool

This code either runs a dev server or outputs files to disk,
depending on the arg passed to it, and uses `site/build.ts`
to provide the list of the site's files.

When in dev mode, if any file under `site` changes, the server
is updated and any SSE watchers of `/reload` are notified.

It enables JSX within Node.js and turns JSX expressions into
highly efficient string builders.

The code is adapted from [this site's source code](https://github.com/thesoftwarephilosopher/immaculata.dev/blob/main/main.ts).

```ts
import * as immaculata from 'immaculata'
import * as hooks from 'immaculata/hooks.js'
import { registerHooks } from 'module'
import ts from 'typescript'
import { fileURLToPath } from 'url'

const tree = new immaculata.FileTree('site', import.meta.dirname)
registerHooks(hooks.useTree(tree))
registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
registerHooks(hooks.compileJsx(compileViaTypescript))

if (process.argv[2] === 'dev') {
  const server = new immaculata.DevServer(8080, { hmrPath: '/reload' })
  server.files = await processSite()

  tree.watch().on('filesUpdated', async (paths) => {
    try { server.files = await processSite() }
    catch (e) { console.error(e) }
    server.reload()
  })
}
else {
  immaculata.generateFiles(await processSite())
}

async function processSite() {
  const mod = await import("./site/build.ts")
  return await mod.processSite(tree)
}

function compileViaTypescript(str: string, url: string) {
  return ts.transpileModule(str, {
    fileName: fileURLToPath(url),
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
      inlineSourceMap: true,
      inlineSources: true,
    }
  }).outputText
}
```
