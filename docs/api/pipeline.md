# Pipeline

The Pipeline API is convenience class for
arbitrarily manipulating an array of files,
usually to produce a front-end file tree,
but isn't specific to that purpose.

## Rationale

You don't need a pipeline object to transform
a `FileTree.files` into a map compatible with `DevServer`
and `generateFiles`. You can just do this:

```ts
const tree = new FileTree('site', import.meta.dirname)

let files = tree.files.values().toArray()

// now do your site processing
files = files.filter(f => /* ... */)
files.forEach(f => /* ... */)
await Promise.all(files.forEach(async f => /* ... */))

const fileMap = new Map(files.map(f => [f.path, f.content]))
server.files = fileMap
generateFiles(fileMap)
```

But that gets very inconvenient very quickly:

* Every `file.content` is always a Buffer, but sometimes
  we want to lazily transform it to a string and use that

* Filtering files is almost always path-based,
  and would be much more convenient with regexes

* Adding and removing individual files or arrays of files
  is technically possible but *very* repetitious

So the `Pipeline` class was created as a convenience.

Here's the same code above with `Pipeline`:

```ts
const tree = new FileTree('site', import.meta.dirname)

const pipeline = Pipeline.from(tree.files)

// now do your site processing
pipeline.without(/.../).remove()
pipeline.with(/.../).do(f => /* ... */)
await pipeline.with(/.../).doAsync(f => /* ... */)

const fileMap = pipeline.results()
server.files = fileMap
generateFiles(fileMap)
```

## API

```typescript
class Pipeline {

  static from(files: FileTree['files']): Pipeline

  private constructor(files: PipelineFile[], filters: Filter[])

  // filter files for the next action
  with(regex: RegExp | string): Pipeline
  without(regex: RegExp | string): Pipeline

  // add/remove individual files
  add(path: string, content: string | Buffer | PipelineFile): void
  del(path: string): void

  // add/remove entire subtrees
  graft(prefix: string, files: Pipeline | FileTree): void
  remove(): void

  // foreach conveniences
  do(fn: (file: PipelineFile) => void): void
  async doAsync(fn: (file: PipelineFile) => void | Promise<void>):
    Promise<void>

  // map conveniences
  all(): PipelineFile[]
  paths(): string[]

  // ill give you three guesses what this does
  copy(): Pipeline

  // return a map compatible with generateFiles and DevServer
  results(): Map<string, string|Buffer>

}

class PipelineFile {

  path: string
  content: Buffer

  constructor(path: string, content: string | Buffer)

  // return #text ??= content.toString('utf8')
  text: string

  // return text ?? content
  textOrContent() { return this.#text ?? this.content }

  copy(path = this.path): PipelineFile

}
```
