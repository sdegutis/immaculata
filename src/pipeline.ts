import { FileTree } from "./filetree.js"

class PipelineFile {

  path: string
  content: Buffer

  constructor(path: string, content: string | Buffer) {
    this.path = path
    this.content = typeof content === 'string' ? Buffer.from(content) : content
  }

  #text?: string | undefined
  get text() { return this.#text ??= this.content.toString() }
  set text(s) { this.#text = s }
  textOrContent() { return this.#text ?? this.content }

  copy(path = this.path) {
    const copy = new PipelineFile(path, this.content)
    copy.#text = this.#text
    return copy
  }

}

type Filter = { regex: RegExp, negate: boolean }

export class Pipeline {

  static from(files: FileTree['files']) {
    const initial = [...files.values().map(f => new PipelineFile(f.path, f.content))]
    const pl = new Pipeline()
    pl.#real = initial
    return pl
  }

  #real: PipelineFile[] = []
  #filters: Filter[] = []

  private static create(files: PipelineFile[], filters: Filter[]) {
    const pl = new Pipeline()
    pl.#real = files
    pl.#filters = filters
    return pl
  }

  all() {
    return this.#real.filter(file => this.#matches(file))
  }

  copy() {
    return Pipeline.create(this.#real.map(f => f.copy()), this.#filters)
  }

  #matches(file: PipelineFile): boolean {
    return this.#filters.every(f => f.regex.test(file.path) === !f.negate)
  }

  add(path: string, content: string | Buffer | PipelineFile) {
    this.#real.push(content instanceof PipelineFile
      ? content.copy(path)
      : new PipelineFile(path, content))
  }

  graft(prefix: string, files: Pipeline | FileTree) {
    if (files instanceof FileTree) files = Pipeline.from(files.files)
    files.do(f => this.add(prefix + f.path, f))
  }

  del(path: string) {
    const idx = this.#real.findIndex(f => f.path === path)
    if (idx !== -1) this.#real.splice(idx, 1)
  }

  with(regex: RegExp | string) {
    return Pipeline.create(this.#real, [...this.#filters, { regex: ensureRegex(regex), negate: false }])
  }

  without(regex: RegExp | string) {
    return Pipeline.create(this.#real, [...this.#filters, { regex: ensureRegex(regex), negate: true }])
  }

  remove() {
    let i = this.#real.length
    while (i--) {
      const file = this.#real[i]!
      if (this.#matches(file)) {
        this.#real.splice(i, 1)
      }
    }
  }

  async doAsync(fn: (file: PipelineFile) => void | Promise<void>) {
    await Promise.all(this.all().map(fn))
  }

  do(fn: (file: PipelineFile) => void) {
    this.all().map(fn)
  }

  paths() {
    return this.all().map(f => f.path)
  }

  results() {
    return new Map(this.all().map(f => [f.path, { content: f.textOrContent() }]))
  }

}

function ensureRegex(s: RegExp | string) {
  return typeof s === 'string' ? new RegExp(s) : s
}
