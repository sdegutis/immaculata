# Enabling HMR in Node.js

By default, the native Node.js module system caches module exports.
The new `--watch` and `--watch-paths` CLI param allows reloading
the entire runtime when the given paths change. This workflow is
sufficient for simple scripts.

But for a fast development cycle, we should avoid discarding state,
whether singletons, data files, or code modules, unless they change.

Using `immaculata`, you can:

* Load a file tree into memory and keep it updated
* Tell the Node.js module system to load from this tree
* Invalidate modules when changed for re-execution
* Invalidate modules when any of their dependencies change
* Optionally transpile JSX/TSX modules however you want

A simple example of enabling HMR in Node.js:

```ts
import { FileTree } from "immaculata"
import { useTree } from "immaculata/hooks.js"
import { registerHooks } from 'module'

const tree = new FileTree('site', import.meta.dirname)
registerHooks(useTree(tree))

const myModule = await import('site/myModule.js')
// site/myModule.js is executed

const myModule2 = await import('site/myModule.js')
// site/myModule.js is NOT executed

tree.watch().on('filesUpdated', async () => {
  const myModule = await import('site/myModule.js')
  // site/myModule.js IS executed again if invalidated
})
```

Now any time you save `site/myModule.js`, or any
module that it imports (recursively), the code
in this file will be *re-executed* (via cache
invalidation). This provides efficient HMR in Node.js
using its native module system.

Note that it also works with `require` if the project
is in `ESM` mode (via package.json's `type` key).
But `module.createRequire` will not (yet) respect
the cache invalidation feature due to
[node#57696](https://github.com/nodejs/node/issues/57696).
