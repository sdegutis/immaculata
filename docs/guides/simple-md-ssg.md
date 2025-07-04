# Simple MD SSG

In the manner of the time honored tradition
of writing every site in markdown, this code
implements `processSite` as referenced by the
[Simple build tool](simple-build-tool.md#simple-build-tool) guide.

```ts
import { Pipeline, type FileTree } from 'immaculata'
import { md } from "./markdown.ts"
import { template } from "./template.tsx"

export function processSite(tree: FileTree) {
  const files = Pipeline.from(tree.files)

  // make `site/public/` be the file tree
  files.without('/public/').remove()
  files.do(f => f.path = f.path.slice('/public'.length))

  // find all .md files and render in a jsx template
  files.with(/\.md$/).do(f => {
    f.path = f.path.replace('.md', '.html')
    f.text = template(md.render(f.text))
  })

  return files.results()
}
```
