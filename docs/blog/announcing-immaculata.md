# Announcing Immaculata

## tldr

I made a library that makes it trivial
to build a modern build tool in Node.js
using DX primitives.

### Module reloading

These 5 loc enable HMR inside Node.js *natively*.

```ts
import { FileTree, hooks } from 'immaculata'
import { registerHooks } from 'module'

// keep an in-memory version of file tree under "./site"
const tree = new FileTree('site', import.meta.dirname)

// keep it up to date
tree.watch().on('filesUpdated', reload)

// invalidate modules under "site" when they change
registerHooks(hooks.useTree(tree))

// importing modules under 'site' now re-executes them
async function reload() {
  const { something } = await import("site/dostuff.js")
  // "something" is never stale
}
```

### Native JSX

These 3 loc enable importing JSX files in Node.js *natively*.

```ts
import { compileJsx, mapImport } from 'immaculata/hooks.js'
import { registerHooks } from 'module'

registerHooks(mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
registerHooks(compileJsx((src, url) => myCompileJsx(src, url)))

// you can now import tsx files!
const { template } = await import('./site/template.tsx')
```

## Rationale

Years ago, I got tired of using frameworks.
They're all opinionated, even if they don't say so.

But
[*nobody*](https://github.com/prettier/prettier/issues/5948)
[*thinks*](https://www.reddit.com/r/Zig/comments/ooknzg/lament_for_the_unused_parameter/)
[*the*](https://world.hey.com/dhh/turbo-8-is-dropping-typescript-70165c01)
[*same*](https://www.reddit.com/r/linux/comments/1ikt1fq/can_anyone_eli5_the_general_rust_in_linux_kernel/)
[*way*](https://go.dev/blog/loopvar-preview).


So instead of making another framework like Vite or Astro,
I made a library that just exports the DX primitives
that allow you to build exactly the build tool you need.

### HMR in Node.js

At the heart of the development cycle is
*discarding as little runtime state as possible*.
The less we have to re-run, the faster we can code.

We already have server-side events (SSE) for hot-module-reloading (HMR) in the browser.
And recently Node.js added `--watch` which
restarts the *entire process*. But that's too slow.

Immaculata provides three primitives to help with this:

1. [FileTree](../api/filetree.md#filetree), an in-memory representation of a given directory recursively

2. [FileTree.watch](../api/filetree.md#watch) which keeps the tree up to date with minimal fs-reads

3. [hooks.useTree](../api/module-hooks.md#usetree) which invalidates stale modules

In [just 5 lines of code](#module-reloading),
you can use these to create a workflow where saving any file
will re-execute any modules that depend on it, and *only* those modules.

[Learn more about HMR in Node.js](../guides/enabling-hmr.md#enabling-hmr-in-nodejs)

### JSX in Node.js

Producing HTML from a server is just string building.
When writing a website, JSX can be *very* convenient
as a very clean and straightforward way to do so.

>  &mdash; Sun Tzu {style="float:right;"}
> 
> "Every sufficiently complex program develops code generation."

With Immaculata, you can import and use `.jsx` and `.tsx`
files at runtime using Node's native module system,
complete with working source maps for debugging.

```tsx
import { hooks } from 'immaculata'
import { registerHooks } from 'module'
import ts from 'typescript'
import { fileURLToPath } from 'url'

registerHooks(hooks.compileJsx((src, url) => {
  return compileTsx(src, fileURLToPath(url)).outputText
}))

function compileTsx(str: string, filename: string) {
  return ts.transpileModule(str, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
      inlineSourceMap: true,
      inlineSources: true,
    }
  })
}

const mod = await import('./path/to/file.tsx')
```

The above example implicitly uses `react/jsx-runtime` as usual.
But supposing you want to use anything else? Trivial.

```ts
import { FileTree, hooks } from 'immaculata'
import { registerHooks } from 'module'

// efficient string builder
registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/dist/jsx-strings.js'))

// or use another module
registerHooks(hooks.mapImport('react/jsx-runtime', 'another-jsx-lib/jsx.js'))

// or bring your own impl
export const tree = new FileTree('site', import.meta.dirname)
registerHooks(hooks.mapImport('react/jsx-runtime', tree.root + '/myjsx.js'))
```

[Learn more about JSX/TSX in Node.js](../guides/enabling-jsx.md#enabling-jsx-in-nodejs)

## Innovative solutions

Because immaculata doesn't force any way of thinking,
and instead only provides orthogonal primitives,
we have freedom to come up with innovative solutions.

For example, you might want to use JSX string building
directly after parsing Markdown:

```tsx
import { Head, Html, Main, Navbar, Sidebar } from "../template/core.tsx"
import { md, type Env } from "./markdown.ts"
import { tocToHtml } from './toc.ts'

// ...

const env: Env = {}
const result = md.render(f.text, env)
f.text = <Html>
  <Head />
  <body>
    <Navbar pages={pages} />
    <Main content={result} />
    <Sidebar toc={tocToHtml(env.toc!)} />
  </body>
</Html>

// ...
```

This example was taken from
[processSite](https://github.com/thesoftwarephilosopher/immaculata.dev/blob/main/site/build/process.tsx)
as used to build this website.
