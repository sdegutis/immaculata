# Enabling JSX in Node.js

By default, the native Node.js module system:

* Refuses to consider `.jsx` or `.tsx` files to be importable modules
* Doesn't know how to transpile JSX syntax into JavaScript

Using `immaculata`, you can:

* Make Node.js recognize `.jsx` and `.tsx` files as valid modules
* Tell Node.js how to transform JSX/TSX into valid JavaScript
* Remap the default `react/jsx-runtime` to another module

```ts
import { compileJsx } from "immaculata/hooks.js"
import { registerHooks } from "module"
import ts from 'typescript'
import { fileURLToPath } from "url"

// transpiles tsx into javascript when Node.js loads it
registerHooks(compileJsx((str, url) =>
  ts.transpileModule(str, {
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
))
```



## Remapping JSX implementation

By default, using JSX will auto-import `react/jsx-runtime` like usual.

You'll almost definitely want to remap that import to *anything else*:

```ts
import { hooks } from "immaculata"
import { registerHooks } from "module"

registerHooks(hooks.mapImport('react/jsx-runtime', 'another-jsx-impl'))
```



## Simple JSX string-builder

The module `'immaculata/jsx-strings.js'` provides
`react/jsx-runtime`-compatible exports that are
implemented as a highly efficient HTML string builder.

```ts
import { hooks } from "immaculata"
import { registerHooks } from "module"

registerHooks(hooks.mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
```



## Using your own JSX implementation

To use a JSX implementatoin within a [FileTree](../api/filetree.md#filetree), prepend its `root`:

~~~ts
import { FileTree, hooks } from "immaculata"
import { registerHooks } from "module"

const tree = new FileTree('site', import.meta.dirname)

registerHooks(hooks.mapImport('react/jsx-runtime', tree.root + '/my-jsx.ts'))
~~~



## Importing with .js

To allow importing `.jsx/.tsx` files but using the `.js` extension:

```ts
import { hooks } from "immaculata"
import { registerHooks } from "module"

registerHooks(hooks.tryAltExts)

import('./foo.js') // now works even though only foo.tsx exists
```



## JSX Types

If you're not using a library
that provides JSX types,
you'll need to add your own.

Here's a basic starter:

```ts
declare namespace JSX {

  type IntrinsicElements = Record<string, any>

  interface ElementChildrenAttribute {
    children: any
  }

}
```

If you're using `immaculata/jsx-strings.js` with [mapImport](../api/module-hooks.md#mapimport),
then your JSX types won't be imported automatically.
So you'll need to import the JSX types manually:

```ts
import type { } from 'immaculata/jsx-strings.js'
```

This doesn't add anything to [IntrinsicElements], so you'll either need to create that, or import this:

```ts
import type { } from 'immaculata/jsx-strings-html.js'
```

You can use interface augmentation to add or modify keys:

```ts
declare namespace JSX {

  // add key-values, e.g.
  interface IntrinsicElements {
    div: HtmlElements['div'] & { foo: string }
    bar: { qux: number }
  }

  // or just extend something or whatever,
  // useful for extending a mapped type
  interface IntrinsicElements extends Foo { }

  // note that you can do both, and in either order

}
```

[IntrinsicElements]: https://www.typescriptlang.org/docs/handbook/jsx.html#intrinsic-elements
