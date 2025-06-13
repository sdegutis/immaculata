# Change log

## main

* Moved `useTree(tree)` module hook function to `tree.moduleHooks()` method
* Removed undocumented and unuseful `exportAsString` module hook

## 2.6.1

* Fix [useTree](module-hooks.md#usetree) to properly cooperate with other resolver hooks
  * Before this fix, it had to be used in a specific order to other resolver hooks

## 2.6.0

* Removed index import
* Renamed `transformImports` to `transformExternalModuleNames`
* Removed `"homepage"` feature of [transformExternalModuleNames](transform-imports.md#transformexternalmodulenames)

## 2.5.0

* Added `style?: string` to HTML element attributes in `jsx-strings-html.d.ts`
* Removed `babel.transformImportsPlugin`
* Added [transformImports](transform-imports.md#transformexternalmodulenames) that uses TypeScript directly

## 2.4.0

* Added core JSX stuff to `jsx-strings.d.ts` module
  * Added HTML intrinsic elements to `jsx-strings-html.d.ts`
  * See the [enabling JSX guide](../guides/enabling-jsx.md#jsx-types)


## 2.3.0

* Fix usage of `generateFiles.parent`.
* Make `generateFiles` logs line up.
* Remove trailing slashes from `DevServer` `prefix`.
* Log `prefix` with host in `DevServer` constructor.

## 2.2.2

* Make [generateFiles](generate-files.md#generatefiles) have default `parent` of `''` (cwd)

## 2.2.1

* Fix type error.

## 2.2.0

* Changed [new FileTree()](filetree.md#constructor) to take `meta.import.dirname` instead of `meta.import.url`
* Changed [generateFiles](generate-files.md#generatefiles) to require `parent` and move optional options to `opts` object

## 2.1.0

* Added `prefix?: string` to [DevServer](dev-server.md#devserver) options
* Added [babel.transformImportsPlugin](transform-imports.md#transformexternalmodulenames)

## 2.0.1

Fixed duplicate module invalidation events.

Supposing you had three modules, `a.js`, `b.js`, and `c.js`, and this dependency tree:

* `a.js`
  * `b.js`
    * `c.js`
  * `c.js`

If you change `c.js`, *two* module invalidation events would be emitted:

1. Because `b.js` directly imports (depends on) it
2. Because `a.js` directly imports (depends on) it

Now changing `c.js` will only emit *one* module invalidation event.

This means you can safely call one-time cleanup functions in the `onModuleInvalidated` callback.

Of course, if you re-execute `a.js` (e.g. `import("a.js")`) then it will start all over again,
and you will get another module invalidation event for `c.js` when `c.js` changes, but still only one.

## 2.0.0

### Export changes

Changed export paths to not use `/dist/`, e.g.:

* `'immaculata/dist/jsx-strings.js'` => `'immaculata/jsx-strings.js'`
* `'immaculata/dist/*.js'` => `'immaculata/*.js'`

### FileTree changes

* Changed `fileTree.watch` to not take `fn` anymore
* Changed `fileTree.watch` to return `EventEmitter` with `filesUpdated` event
* Changed `fileTree.watch` to take `debounce` instead of `opts: { debounceMs }`
* Fixed `fileTree.watch` when called multiple times (no-op, returns same emitter)
* Added `fileTree.onModuleInvalidated` to be called *inside* modules
* Added `fileTree.addDependency` for module invalidation
* Added `moduleInvalidated` event to `fileTree.watch()` events
* Moved `fileTree.enableImportsModuleHook` to `hooks.useTree`

### Hook changes

* Put all hooks under `hooks` namespace from main export
  * Also exported individually from `'immaculata/hooks.js'`
* Moved `fileTree.enableImportsModuleHook` to `hooks.useTree`
* Removed `jsxRuntimeModuleHook` as too specific
* Added `hooks.mapImport` to replace `jsxRuntimeModuleHook`
* Renamed `exportAsStringModuleHook` => `hooks.exportAsString`
* Renamed `tryTsTsxJsxModuleHook` => `hooks.tryAltExts`
* Renamed `compileJsxTsxModuleHook` => `hooks.compileJsx`

### DevServer changes

* Fixed double-encode of default data on HMR reload

## 1.2.0

The `ignore` option of `.watch(...)` was from when it just forwarded options to `chokidar`.
But we usually also want to exclude files with given paths from the tree *itself*.
So the option has been removed in favor of a new `exclude` option in the constructor.

And since we already keep an in-memory file tree (that's the whole *point* of `FileTree`),
it turned out to be very easy to give a highly detailed report of what actually changed.
So the `onChange` callback to `.watch(...)` now receives `FileTreeChange[]` where:

```ts
export type FileTreeChange = { path: string, change: 'add' | 'dif' | 'rem' }
```

* Added `opts?: { exclude: (path: string, stat: fs.Stats) => any }` to `FileTree` constructor
* Added `debounceMs` option to `FileTree.watch`
* Added `FileTree.addDependency` method
* Removed `ignore` option from `FileTree.watch`
* Changed `onChange` callback parameter type of `FileTree.watch`
* The `onChange` callback is no longer called when a file is saved but unchanged

[Full Changelog](https://github.com/thesoftwarephilosopher/immaculata/compare/1.1.0...1.2.0)


## 1.1.0

Removed `tree.processFiles` as being too trivial and restrictive.

To upgrade, replace:

```ts
const result = tree.processFiles(files => {
  // ...
})
```

with:

```ts
const files = Pipeline.from(tree.files)
// ...
return files.results()
```

(In fact, that's literally all the method originally did.)

[Full Changelog](https://github.com/thesoftwarephilosopher/immaculata/compare/1.0.0...1.1.0)
