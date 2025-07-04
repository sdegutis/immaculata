# Module Hooks


Hooks for [module.registerHooks](https://nodejs.org/api/module.html#moduleregisterhooksoptions).

## tryAltExts

```ts
const tryAltExts: ModuleHook
```

Resolver hook that looks for `.{ts,tsx,jsx}` when `.js` is not found.



## compileJsx

```ts
function compileJsx(
  fn: (src: string, url: string) => string
): ModuleHook
```

Loader hook for JSX/TSX files which just passes the
source code and file URL to your function to compile.



## mapImport

```ts
function mapImport(from: string, to: string): ModuleHook
```

Remaps the given import module specifier to another.

For example:

```ts
import { hooks } from 'immaculata'
import { registerHooks } from 'module'
registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
```



## useTree

```typescript
useTree(tree: FileTree): ModuleHook
```

This actually has two different but inherently correlated purposes:

* Module invalidation
* Loading from memory

Returns a hook that hooks into Node.js's
built in `import` and `require`
and returns the contents from [tree.files](filetree.md#files)
instead of loading from disk.

A query string including the current version of the file
is appended to the import path to enable cache busting,
so that when a file changes under the tree, it can be
imported again, and will be re-run.

This cache invalidation also extends to any file that
has required the file that has changed, so that there
are never stale modules.

```ts
import module from 'node:module'

const tree = new FileTree('site', import.meta.dirname)

module.registerHooks(hooks.useTree(tree))

import('site/myfile.js')
```
