# Immaculata

*Node.js developer conveniences geared towards web dev*

* Use [Module reloading (HMR) hooks](#module-hmr-in-nodejs) in Node.js's native module system
* Use [JSX module transpilation hooks](#native-jsx-in-nodejs) in Node.js's native module system
* Use [FileTree](src/filetree.ts) to load a file tree from disk into memory
* Use [DevServer](src/dev-server.ts) to serve an in-memory file tree
* Use [generateFiles](src/file-generator.ts) to write an in-memory file tree to disk
* Use [Pipeline](src/pipeline.ts) to conveniently transform an in-memory file tree

# Module HMR in Node.js

```ts
import { FileTree, hooks } from 'immaculata'
import { registerHooks } from 'module'

// keep an in-memory version of file tree under "./src"
const tree = new FileTree('src', import.meta.dirname)

// invalidate modules under "src" when they change
registerHooks(tree.moduleHooks())

// keep it up to date
tree.watch().on('filesUpdated', doStuff)
doStuff()

// importing modules under 'src' now re-executes them
async function doStuff() {
  const { stuff } = await import("src/dostuff.js")
  // "stuff" is never stale
}
```

# Native JSX in Node.jS

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
