# Immaculata

*Front-end build tool for 2026*

## Rationale

Let's walk through ordinary use-cases, starting at the simplest need and adding features to solve it.

Suppose you just want to output some HTML, JS, and CSS.

### Web server

Some features don't work with `file:///`, and `python -m http.server` holds onto file handles, making it hard to move/rename files.

So I built the simplest possible web server in pure node.js, that caches all your files and holds onto them in memory.

It uses chokidar to watch for file changes, and recaches the files, so it always serves up fresh files.

### TypeScript

Type annotations are not yet part of ECMAScript because [reasons](https://github.com/tc39/notes/blob/main/meetings/2023-09/september-27.md#type-annotations-stage-1-update-and-discussion). But I really like using them.

So, any time the file server encounters a `.ts` file, it just transforms it via Babel, and pretends it only saw a `.js` file. The in-memory file system only sees a `.js` file there.

This way you can write all your front-end in TypeScript, and pretend you didn't.

### Dynamic files

Sometimes we need to include build-time data into a file. For example, a timestamp, or the contents of anothr file.

If a file ends with `.<ext>.ts`, it's run as a module, and its default export becomes the contents.

For example, `index.html.ts` becomes `index.html` and the default export is the string or UInt8Array served to the browser.

### Importing directories

Say you have a list of blog posts as markdown files. It would be handy to generate a ToC on the home page.

You can `import myfiles from './some/dir/` and you get an array of file objects like `{ path: string, content: string | UInt8Array }`.

Notice the `/` at the end of the import. That's what causes this to be a dir import.

The path is relative to your site's root, rather than your local file system.

### Array files

A blog with just a ToC is useless, so we need to emit the blog files too.

Any file with brackets is emitted as multiple files.

So if you have `articles/[slug].html.ts`, and this file contains an array of `[name: string, content: string | UInt8Array]` tuples, the `[slug]` part of the filename is replaced with the `name` for each entry in the array, and the content is the content.

In the future, maybe we should have it return a Map or an Object, so that we can make sure keys are unique.

### Site processing

Sometimes you want to automatically append a copyright or timestamp to the end of every HTML file.

Or maybe you want to generate a sitemap based on all files.

To do this, we just have a site processor that takes an iterable of file objects in, and emits a map of files. These are the same file objects you work with when importing directories, and the output is just `Map<string,string|UInt8Array>`.

I have found this to be *incredibly* flexible. I've generated sitemaps, importmaps, automated copyrights on every HTML/JS file, filtered files out depending on whether the app is running from the dev server or static production server, there are so many useful use-cases for this.

The default processor is what does the Dynamic Files and Array Files logic above. You can write your own at `<siteroot>/@imlib/processor.ts` and make it the default export, and you can import the default processor and use that one within your logic.

### JSX

At this point JSX is ubiquituous, and I can't really write UI code without it anymore.

So if a `.tsx` file is encountered, it's translated into a `.js` file like usual, but its JSX is transformed into auto imports, since [my vanilla JSX proposal](https://vanillajsx.com/proposal/) went nowhere.

The auto-import path for Dynamic Files is `<siteroot>/@imlib/jsx-node.ts` or the default impl, which is a robust stringifier.

The auto-import path for browser-side files is at `<siteroot>/@imlib/jsx-browser.ts` and uses the most simplistic DOM element creator that you should probably override with your own file, maybe exporting React's JSX impl or something.

No `JSX` namespace is exported. You'll have to provide that for yourself based on how you implement JSX or whichever implementation you export from these auto-import paths.

### HMR

Sometimes, but not always, you want to reload the page when the site rebuilds.

The dev server adds SSE path `/@imlib/hmr` that gets pinged on rebuilds.

All it takes to reload your page is `new EventSource('/@imlib/hmr').onmessage = () => location.reload()`, which you could auto-insert into HTML files via the Site Processor, or add it to certain .ts files, or whatever you want.

For now, there's no data passed, but maybe it would be useful to pass the files changed.

## Usage

### Installing

```bash
npm i immaculata
```

### Running locally

Put some files in `<projectroot>/site`, like HTML, JS, or CSS files. Or even `.ts` or `.tsx` files.

Then run `immaculata dev`. Or do it with VS Code's launcher:

```json
{
  "version": "0.2.0",
  "configurations": [{
    "name": "Launch Program",
    "program": "${workspaceFolder}/node_modules/immaculata/out/cli.js",
    "args": ["dev"],
    "request": "launch",
    "skipFiles": ["<node_internals>/**"],
    "type": "node"
  }]
}
```

### Getting TypeScript to work

You'll need to import everything as `.js` whether it was implemented as `.ts` or `.tsx`.

To make this work in VS Code, add this line to `.vscode/settings.json`:

```jsonc
  "typescript.preferences.importModuleSpecifierEnding": "js",
```

### Getting Import Dirs to work

In `tsconfig.json`, add:

```jsonc
    "types": [
      "node", // only include if needed
      "immaculata/runtime.d.ts"
    ],
```

### Getting JSX to work

To fix importing `.tsx` as `.js` in VS Code, add this line to `tsconfig.json`:

```jsonc
  "jsx": "react-native",
```

### Publishing to GitHub Pages

Add `/docs/` to .gitignore.

Enable Actions, then add this to `.github/workflows/static.yml`:

```yaml
name: Deploy static content to Pages

on:
  push:
    branches: ["main"]

  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "22"
          cache: npm

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run generate

      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'docs'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Special thanks

St. Joseph helped with his [expectedly high engineering ability](https://www.lorettochapel.com/staircase).

This was sponsored by the [Immaculate Conception](https://en.wikipedia.org/wiki/Bernadette_Soubirous), the Queen of Heaven.

And of course the [Blood of Jesus](https://www.biblegateway.com/passage/?search=Hebrews%2013%3A20-21&version=RSVCE) makes all things possible.
