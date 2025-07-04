# (ab?)using Node module hooks to speed up development

I wanted a much faster way to develop the front-end of my site.

And I didn't want to be tied down to any one way of doing anything.

So I made a bunch of orthogonal stuff. Half evolved into [module hooks](../api/module-hooks.md#module-hooks).

## Memory copy of file tree

I wanted to reduce disk reads when reading files.

So I made [FileTree](../api/filetree.md#filetree) to load a file tree into memory
and optionally keep it updated with [tree.watch](../api/filetree.md#watch).

```ts
import { FileTree } from 'immaculata'

export const tree = new FileTree('site', import.meta.dirname)

// can now load files from memory rather than fs.readFileSync('site/style.css')
tree.files.get('/style.css')

// and react to file system changes
tree.watch().on('filesUpdated',      changes => /* ... */)
tree.watch().on('moduleInvalidated', path    => /* ... */)
```

## Hot module replacement/reloading

I wanted to develop modules and re-execute them without restarting the whole process.

So I created the [useTree](../api/module-hooks.md#usetree) module hook that invalidates re-saved module files using cache busters.

```ts
import { FileTree, hooks } from 'immaculata'
import { registerHooks } from 'module'

export const tree = new FileTree('site', import.meta.dirname)
registerHooks(hooks.useTree(tree))

tree.watch().on('filesUpdated', dostuff)
dostuff()

function dostuff() {
  import(tree.root + '/myfile.js')
  // re-executes myfile.js if and only if it changes
  // (or anything it imports, directly or indirectly)
}
```

## Module invalidation callbacks

I wanted to [properly dispose singletons](https://shiki.matsu.io/guide/best-performance#cache-the-highlighter-instance)
instead of restarting the whole process.

So I made [onModuleInvalidated](../api/filetree.md#onmoduleinvalidated) to run code when its being replaced with a newer version.

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

## Incorrect file extensions

I wanted to be able to import `foo.{ts,tsx,jsx}` but using the `.js` file extension.

So I made a [tryAltExts](../api/module-hooks.md#tryaltexts) module hook that looks for `.{ts,tsx,jsx}` when `.js` isn't found.

```ts
import { hooks } from 'immaculata'
import { registerHooks } from 'module'

registerHooks(hooks.tryAltExts)
import('./foo.js') // now works even though only foo.tsx actually exists
```

## Compiling JSX

I wanted to import and run JSX files natively in Node.js.

So I made a [compileJsx](../api/module-hooks.md#compilejsx) module loader that transforms JSX to JS with the function you give it.

```ts
import { hooks } from 'immaculata'
import { registerHooks } from 'module'

registerHooks(hooks.compileJsx((src, url) => /* ... use swc/ts/etc ... */))
```

## Remapping imports

I wanted to remap `react/jsx-runtime` to `./my-jsx-impl.js` for experimentation.

So I made a [mapImport](../api/module-hooks.md#mapimport) module resolver hook that remaps imports by name.

```ts
import { hooks } from 'immaculata'
import { registerHooks } from 'module'

// experiment with your own JSX implementation
registerHooks(hooks.mapImport('react/jsx-runtime', import.meta.resolve('my-jsx-impl.js')))

// or use a highly optimized string-builder implementation
registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
```
