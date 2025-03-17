# Immaculata

*Front-end build tool for 2026*

## Rationale

See https://immaculata.dev/

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

### Getting JSX to work

To fix importing `.tsx` as `.js` in VS Code, add this line to `tsconfig.json`:

```jsonc
  "jsx": "react-native",
```

### Getting Import Dirs to work

In `tsconfig.json`, add:

```jsonc
    "types": [
      "node", // only include if needed
      "immaculata/runtime.d.ts"
    ],
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

The engineering ability of [St. Joseph the Worker](https://www.lorettochapel.com/staircase) was borrowed.

This was sponsored by the [Immaculate Conception](https://en.wikipedia.org/wiki/Bernadette_Soubirous), the Queen of Heaven.

And of course the [Blood of Jesus](https://www.biblegateway.com/passage/?search=Hebrews%2013%3A20-21&version=RSVCE) makes all things possible.
