# generateFiles

```typescript
function generateFiles(
  out: Map<string, Buffer | string>,
  opts?: {
    parent?: string, // default <cwd>
    dry?: boolean,   // default false
    dir?: string,    // default 'docs'
  }
): void
```

Creates dirs and files on disk at the given
subroot based on the given file map.

Paths are absolute, and made relative to `outDir`.

```typescript
import { generateFiles } from 'immaculata'

generateFiles(new Map([
  ['/index.html', 'hello world'],
  ['/about.html', 'about my site'],
  ['/css/main.css', 'body{...}'],
]))

// writefile: docs/index.html
// writefile: docs/about.html
// mkdir: docs/css
// writefile: docs/css/main.css
```
