# HMR natively in Node.js (technical write up)

One of the key factors in rapid development is
discarding as little state as possible.
In Node.js, this means the new `--watch` flags
are not that useful, since they throw everything away.
The ideal is to simply invalidate a module when it changes
or when a module it depends on changes.
This way, all imports and data are always fresh,
but only partial module trees get re-evaluated.

Previously, immaculata did the same thing Vite does now:
use the built-in `node:vm` functionality to create
an ad hoc module system that sits on top of Node's,
and glues these systems together using custom logic.
This effectively creates second class modules.

The main drawbacks are that logic is duplicated and separated.
Duplication happens in finding and loading files, parsing them,
evaluating and storing their module objects, and gluing all these
together with each other and with Node's own module system.
And these systems are inherently separate, so that
native Node module hooks will have no effect on the ad hoc system.

By adding module hooks using Node's built-in `node:module` module,
it's now possible to implement "hot module" functionality natively.

First, we load source files from disk and keep them in memory.
This won't hit memory limits for most projects and dev machines.
To handle this need, we have a [FileTree] class,
which does nothing other than load a file tree into memory,
and optionally keep it up to date via [.watch()][watch],
which returns an `EventEmitter` with a `filesUpdated` event.
Node's native file watcher is now disk efficient,
and returns all the information we need,
so we don't need `chokidar` for this.

Next, we have the [useTree] dual-hook which does two key things.
First, it implements a loader hook that returns the source `string`
using `tree.files.get` instead of `fs.readFileSync`.
Second, it implements a resolver hook that appends `?ver=${file.version}`
to the URL of any given module.

What ties all of this together is the fact that
the [FileTree] constructor and the [watch] method
both set each file's `version` to `Date.now()`.
This becomes an automatic query busting string,
which works because Node internally uses URLs
to represent all modules.

In practice, this means that we can import a module file initially,
and import the same file again after the `filesUpdated` event,
and either the cached module object will be returned,
or the file will be re-evaluated if it was updated.

The one missing piece of this puzzle was dependency trees.
Because module hooks are called during import,
we can use this information to register dependencies,
which is done internally within [FileTree].
Each time a dependency of a module changes,
the parent module itself also has its version updated.
This works recursively, so that modules are always fresh,
and updated even if a single deep dependency changes.

The code to use these hooks is relatively short and simple.

```ts
import { FileTree } from "immaculata"
import { useTree } from "immaculata/hooks.js"
import { registerHooks } from 'node:module'

const tree = new FileTree('src', import.meta.dirname)
registerHooks(useTree(tree))

const myModule = await import('src/myModule.js')
// src/myModule.js is executed

const myModule2 = await import('src/myModule.js')
// src/myModule.js is NOT executed a second time

tree.watch().on('filesUpdated', async () => {
  const myModule = await import('src/myModule.js')
  // src/myModule.js IS executed again iff invalidated
})
```

As a consequence of having a dependency tree,
we can easily send a `moduleInvalidated` event
at the same time that we update its `version`.
And because trees are just objects,
we can import them from a module that
needs to cleanup resources on invalidation.

This site uses Shiki for syntax highlighting,
which requires that you use it as a singleton.
Calling its `dispose` method on invalidation
allows me to edit the syntax highlighting file
without having to restart the whole process.
(This code is taken verbatim from this site.)

```ts
import * as ShikiMd from '@shikijs/markdown-it'
import type MarkdownIt from 'markdown-it'
import * as Shiki from 'shiki'
import { tree } from '../../static.ts'

const highlighter = await Shiki.createHighlighter({
  themes: ['dark-plus'],
  langs: ['tsx', 'typescript', 'json', 'yaml', 'bash'],
})

export function highlightCode(md: MarkdownIt) {
  md.use(ShikiMd.fromHighlighter(highlighter, { theme: 'dark-plus' }))
}

tree.onModuleInvalidated(import.meta.url, () => {
  highlighter.dispose()
})
```

[FileTree]: ../api/filetree.md#filetree
[watch]: ../api/filetree.md#watch
[useTree]: ../api/module-hooks.md#usetree
