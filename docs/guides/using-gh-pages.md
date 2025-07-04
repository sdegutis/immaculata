# Publishing to GH Pages

Using the [Simple build tool guide](simple-build-tool.md#simple-build-tool)
as a starting point, it's trivial to publish to GitHub pages:

```yaml
# .github/workflows/static.yml

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
          node-version: "23.10"
          cache: npm

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: node main.ts generate

      - name: Upload artifact
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
