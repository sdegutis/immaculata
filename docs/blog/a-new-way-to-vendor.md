# A new way to vendor

We are close to the future of bundle-less front-end development. ESM modules are
prevalent in browsers. [JSON](https://caniuse.com/?search=import%20type%20json)
and [CSS](https://caniuse.com/?search=import%20type%20css) imports are standard
and almost baseline.

In my 5 years of not using bundles, I've streamlined a way to generate files for
front-ends in the simplest possible way, while maintaining flexibility so that I
don't have to maintain a complex, opinionated framework, which would burn me out.

## Mapping rather than bundling

One of the techniques I came up with is keeping a live in-memory copy of a local
file tree, transforming it to a new file tree representing a front-end website,
and repeating this step if any file changes. So if I have a folder called
`./site/`, which contains HTML, TypeScript, and Sass files, I could copy them to
an out tree, transpiling and renaming as needed:

```ts
import { FileTree, generateFiles } from "immaculata"

const tree = new FileTree('site', import.meta.dirname)

tree.watch().on('filesUpdated', process)
process()

function process() {
  let files = tree.files.values().toArray()
  
  files = files.filter(isTypeScript).forEach(transpileAndRenameTsx)
  files = files.filter(isSass).forEach(transpileAndRenameSass)
  
  const out = new Map(files.map(f => [f.path, f.content]))
  
  server.files = out // update dev server
  generateFiles(out) // or write to disk
}
```

So far, this has been a very convenient workflow for me, and met all my needs.

## Vendoring as part of mapping

But then I used a web font. And my page flickered *every time* the site loaded.

The modern solution to this is vendoring web font files and adding `<link
rel="preload" ...>` to each HTML file. It turns out this is *really easy* to add
to the above workflow, even without a bundler:

1. Install a font like `npm i @fontsource-variable/monda`

2. Create a tree for `node_modules/@fontsource-variable/monda`

3. Graft this onto the output tree at `/fonts/monda/`

4. Add `<link rel="stylesheet" href="/fonts/monda/index.css" />` to each HTML file

5. Scan each CSS file for `url(...)` and add those as a `<link rel="preload"
   href={url} ...>`

Because web fonts are only one recursion deep, this is all that's needed. If
they used imports, we'd have to have a more recursive solution. But they don't,
so it *just works*.

## Real world example

In fact, that's how the page you're reading right now was generated:

```tsx
import { Pipeline, FileTree } from 'immaculata'
import { Head, Html, Main, Navbar, Sidebar } from "../template/core.tsx"
import { md, type Env } from "./markdown.ts"
import { tocToHtml } from './toc.ts'

const tree = new FileTree('site', import.meta.dirname)

const martel = new FileTree('node_modules/@fontsource/martel', import.meta.dirname)
const exo2 = new FileTree('node_modules/@fontsource-variable/exo-2', import.meta.dirname)
const monda = new FileTree('node_modules/@fontsource-variable/monda', import.meta.dirname)

export function processSite() {
  const files = Pipeline.from(tree.files)

  // ...

  const fonts = vendorFonts([
    { tree: martel, root: '/fonts/martel', files: ['/index.css', '/700.css'] },
    { tree: monda, root: '/fonts/monda', files: ['/index.css'] },
    { tree: exo2, root: '/fonts/exo2', files: ['/index.css'] },
  ])

  files.with('\.md$').do(f => {
    f.path = f.path.replace('.md', '.html')
    const env: Env = { /* ... */ }
    const result = md.render(f.text, env)
    f.text = <Html>
      <Head files={fonts.links} />
      <body>
        <Navbar pages={pages} />
        <Main content={result} />
        <Sidebar toc={tocToHtml(env.toc!)} />
      </body>
    </Html>
  })

  files.with(/\.tsx?$/).do(f => {
    // ...
    f.text = out.outputText
    f.path = jsPath
  })

  fonts.subtrees.forEach(t => {
    files.graft(t.root, t.files)
  })

  return files.results()
}

function vendorFonts(fonts: {
  tree: FileTree,
  root: string,
  files: string[],
}[]) {
  const links: string[] = []
  const subtrees: { root: string, files: Pipeline }[] = []

  for (const font of fonts) {
    const pipeline = new Pipeline()
    subtrees.push({ root: font.root, files: pipeline })

    for (const file of font.files) {
      const content = font.tree.files.get(file)?.content.toString()!

      for (const match of content.matchAll(/url\(\.(.+?)\)/g)) {
        const path = match[1]!
        pipeline.add(path, font.tree.files.get(path)!.content)
        links.push(<link
          rel="preload"
          href={font.root + path}
          as="font"
          type="font/woff"
          crossorigin
        />)
      }

      pipeline.add(file, content)
      links.push(<link rel="stylesheet" href={font.root + file} />)
    }
  }

  return { subtrees, links }
}
```

### A note on the JSX

The JSX in the above is just a string builder. It's enabled by:

```ts
import { compileJsx, mapImport } from 'immaculata/hooks.js'
import { registerHooks } from 'module'

registerHooks(mapImport('react/jsx-runtime', 'immaculata/jsx-strings.js'))
registerHooks(compileJsx((src, url) => myCompileJsx(src, url)))
```

This allows it to have type-checking and auto-completion.

The functions `<Html>`, `<Navbar pages={pages}>` etc. above are just ordinary
TypeScript functions that return strings (often via more JSX).

But this is just how I personally made this site. The beauty of immaculata is
that you can use it to build any kind of build chain you want. (You could
probably use it to turn JSX into React SSR.)

## Preloading ESM files

The performance you get with bundling is available through [module preloads](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) too.

The same technique above is useful for preloading ESM files:

1. Scan your `files` for all `.js` files

2. For each one, add `<link rel="modulepreload" href={jsUrl}/>` to all HTML files

3. For extra efficiency, scan each HTML/JS file for imports and only include those

## Conclusion

Overall, this technique has served me well for several sites including [the one
you're on](https://github.com/thesoftwarephilosopher/immaculata.dev/blob/main/site/build/process.tsx).

Pros:

* Just as fast and efficient as bundling
* Don't need an opaque, heavyweight bundler
* Preloading is tailored to your specific needs

Cons:

* Needs slightly more code per project
* Code needed might be disproportionately complex (e.g. scanning HTML/JS files)

Mitigations:

* Things like `vendorFonts` above (or `scanForImports`) can become NPM libraries
* Healthy library competition can produce ideal vendor functions
