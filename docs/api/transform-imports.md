# TypeScript plugins

## transformExternalModuleNames

```ts
function transformImports(
  projectRoot: string,
  replacements?: Record<string, string>,
): PluginItem
```

Returns a Babel plugin that transforms imports
to use given replacements with these rules:

* Imports starting with `.` or `/` or `http` are left alone
* Full matches are replaced verbatim
* Lib matches only have the lib replaced
* Package import roots are replaced via its "homepage" package.json key

### Usage

```ts
import ts from 'typescript'

function transform(text: string, path: string) {
  return ts.transpileModule(text, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
    },
    transformers: {
      after: [transformImports(import.meta.dirname, {
        // replacements
      })]
    }
  })
}
```

### Examples

```ts
// given
const replacements = {
  'bar/qux': '/_barqux.js',
}

import qux from "bar/qux"

// becomes

import qux from "/_barqux.js";
```

```ts
// given
const replacements = {
  'foo': 'https://example.com/foo123',
}

import foo from "foo"
import foosub from "foo/sub"
import withext from "foo/sub.js"

// becomes

import foo from "https://example.com/foo123";
import foosub from "https://example.com/foo123/sub";
import withext from "https://example.com/foo123/sub.js";
```

### Package lookup

```ts
// node_modules/foo/package.json
{
  "homepage": "http://example.com/api/foo/"
}

// replacements isn't needed when "homepage" is set

import foo from 'foo'
import foobar from 'foo/bar.js'

// becomes

import foo from 'http://example.com/api/foo/'
import foobar from 'http://example.com/api/foo/bar.js'
```

### Using React

```ts
const replacements = {
  'react': 'https://esm.sh/react',
  'react-dom': 'https://esm.sh/react-dom',
}

import React from 'react'
import { createRoot } from 'react-dom/client'

// becomes

import React from "https://esm.sh/react";
import { createRoot } from "https://esm.sh/react-dom/client";
import { jsx as _jsx } from "https://esm.sh/react/jsx-runtime";
```
