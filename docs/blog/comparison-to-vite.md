# Comparing immaculata to Vite

Vite and immaculata have somewhat different goals, with a little overlap.

*Caution:* This is a more technical article than most comparison articles you find.

## Philosophies

Vite prefers kitchen sinkness, bundling code and assets, and ease of use.
Aiming for a fast development cycle of cookie cutter front-end websites,
it offers almost every feature you might need in a bundled website,
just in case you use them, and even if you don't.

Immaculata prefers surgicality, vanilla imports and assets, and flexibility.
Aiming for a fast development cycle of custom or experimental websites,
it offers a small set of orthogonal primitives to solve problems,
preferring well engineered solutions even if they take time.

Some of the differences are fundamental. Some are just because immaculata is newer.

## Features

Vite's feature set centers around its decision to bundle everything.

* TypeScript/JSX support
* Bundling of modules and assets
  * Specialized import resolution
  * Specialized front-end shims
  * Specialized HTML scanning
  * Specialized CSS scanning
  * Code splitting probably
* HMR (hot module replacement)
  * Browser-side through shims
  * Node.js-side through a module system built on top of Node's

Immaculata has a few small features that make Node.js more convenient to develop in.

* Node.js [module hooks](../api/module-hooks.md#module-hooks) for
  * [compiling JSX](../api/module-hooks.md#compilejsx)
  * [remapping imports](../api/module-hooks.md#mapimport)
  * [using .ts/tsx/jsx import paths](../api/module-hooks.md#tryaltexts)
  * [loading files from memory](../api/module-hooks.md#usetree)
  * [stale module invalidation](../api/module-hooks.md#usetree)
* [FileTree](../api/filetree.md#filetree) to keep a recursive file tree in memory
  * [fileTree.watch](../api/filetree.md#watch) to auto-update its contents
* [DevServer](../api/dev-server.md#devserver) to serve files from a file map
* [generateFiles](../api/generate-files.md#generatefiles) to write a file map to disk
* [Pipeline](../api/pipeline.md#pipeline) as a convenient way to turn a file tree into a file map
* [jsx-strings](../guides/enabling-jsx.md#simple-jsx-string-builder) to optionally turn JSX into an efficient string builder

## The bundling war

Vite is centered around bundling, citing performance issues when using ESM *nested* imports,
even with HTTP2. At least half of Vite's features and code would disappear if it didn't bundle.

Immaculata does not bundle, offering you two solutions:

* Just accept browser-side ESM imports, which for most of us is plenty fast enough
* Use a function that scans all imports and injects [modulepreloads](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) into the HTML

This gives two main benefits:

* Immaculata's implementation and feature set are both greatly simplified
* You get *much* finer grained control over how to transform local files into your site

## Hot module reloading (HMR)

### Browser-side

Vite offers a kitchen sink, at the cost of scanning all your front-end files for paths.

Immaculata offers *minimal* browser-side HMR support via a triggerable SSE path in [DevServer](../api/dev-server.md#devserver).
Look for `reload()` and `hmrPath` in the docs.

### Node.js-side

Vite offers Node-side HMR, but at the cost of
[*creating an entire module system* on top of Node's](https://github.com/vitest-dev/vitest/blob/165fb0e8ae398440fc62cd95992e1ea97a1d2388/packages/vite-node/src/client.ts).
Internally, it uses `node:vm` to create second-class modules that are somewhat limited in how they are able to participate in Node's native module system.

Immaculata hooks into Node's native module system to create real, first-class modules.
On top of this, it loads them from memory to speed up development,
and issues `filesUpdated` and `moduleInvalidated` events so you can reload your modules via import.
See [Enabling HMR](../guides/enabling-hmr.md#enabling-hmr-in-nodejs).

Incidentally, immaculata actually *also* used to use `node:vm`,
but as of a month or so ago I had an epiphany of how to use Node's
relatively new module hooks (especially the sync variant)
to get all the same benefits but with none of the downsides.


## Dependencies

Vite offers multiple packages, each having multiple dependencies.

Immaculata only depends on `mime-types`, and only for [DevServer](../api/dev-server.md#devserver).


## Complexity

Vite is multiple moderately sized packages.

Immaculata is 487 lines of highly readable and maintainable code.

For perspective, [*all* of immaculata](https://github.com/thesoftwarephilosopher/immaculata/tree/main/src) is smaller than [vite-node's custom module system](https://github.com/vitest-dev/vitest/blob/165fb0e8ae398440fc62cd95992e1ea97a1d2388/packages/vite-node/src/client.ts).


## "Which should I use?"

Use Vite if

* You want to make a cookie cutter front-end
* You want to have an out of the box solution

Use most of immaculata if

* You want to make a highly customized front-end
* You want to have surgical control over your front-end output
* You want to experiment with making bundle-less sites

Use *some* of immaculata if

* You want to use HMR in Node.js for a faster development cycle
* You want to use JSX in Node.js with your own custom implementation
* You want to use JSX in Node.js as a simple string builder
* You want to remap specific imports in Node.js
* You want to write a map of files to disk conveniently
* You want to load a file tree from disk into memory
* You want to serve a map of in-memory files over HTTP
