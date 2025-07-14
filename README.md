# Immaculata

*Node.js developer conveniences geared towards web dev*

* Use [Module reloading (HMR) hooks](#module-hmr-in-nodejs) in Node.js's native module system
* Use [JSX module transpilation hooks](#native-jsx-in-nodejs) in Node.js's native module system
* Use [FileTree](src/filetree.ts) to load a file tree from disk into memory
* Use [DevServer](src/dev-server.ts) to serve an in-memory file tree
* Use [generateFiles](src/file-generator.ts) to write an in-memory file tree to disk
* Use [Pipeline](src/pipeline.ts) to conveniently transform an in-memory file tree

# Main features

## Module HMR in Node.js

```ts
import { FileTree, hooks } from 'immaculata'
import { registerHooks } from 'module'

// keep an in-memory version of file tree under "./src"
const tree = new FileTree('src', import.meta.dirname)

// load modules under "src" from memory
// and add query string to load latest version
registerHooks(tree.moduleHooks())

// keep tree up to date
// and re-import main module when any file changes
tree.watch().on('filesUpdated', doStuff)
doStuff()

// importing modules under 'src' now re-executes them
async function doStuff() {
  const { stuff } = await import("src/dostuff.js")
  // "stuff" is never stale
}
```

## Native JSX in Node.jS

```ts
import { hooks } from 'immaculata'
import { registerHooks } from 'module'

// compile jsx using something like swc or tsc
registerHooks(hooks.compileJsx(compileJsxSomehow))

// remap "react-jsx/runtime" to any import you want (optional)
registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))

// you can now import tsx files!
const { template } = await import('./site/template.tsx')
```

# API

See https://immaculata.dev/ for full docs until they're merged here.

## DevServer

```ts
const server = new DevServer(8080)
```

```ts
class DevServer {

  // Creates a new http server and begins listening immediately at the given port.
  // Optional fn `onRequest` can modify `res` or `res.req`.
  // If `onRequest` closes the request, it must return handled.
  constructor(port: number, opts?: {
    hmrPath?: string,
    prefix?: string,
    onRequest?: (res: http.ServerResponse) => 'handled' | void,
  })

  // The files to serve. Has the same path format as `tree.files`.
  files: Map<string, string|Buffer>

  // Handler that returns 404 and the given content when the path isn't present in `server.files`.
  notFound?: (path: string) => string

  // Triggers SSE for listeners of `hmrPath`.
  reload(): void

}

```
