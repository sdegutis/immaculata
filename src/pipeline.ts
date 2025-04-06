import type { LiveTree } from "./livetree.js"

class MemFile {

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

}

type Filter = { regex: RegExp, negate: boolean }

export class Pipeline {

  static from(files: LiveTree['files']) {
    const initial = [...files.values().map(f => new MemFile(f.path, f.content))]
    return new Pipeline(initial, [])
  }

  #real
  #filters: Filter[] = []

  private constructor(files: MemFile[], filters: Filter[]) {
    this.#real = files
    this.#filters = filters
  }

  all() {
    return this.#real.filter(file => this.#matches(file))
  }

  #matches(file: MemFile): boolean {
    return this.#filters.every(f => f.regex.test(file.path) === !f.negate)
  }

  add(path: string, content: string | Buffer) {
    this.#real.push(new MemFile(path, content))
  }

  del(path: string) {
    const idx = this.#real.findIndex(f => f.path === path)
    if (idx !== -1) this.#real.splice(idx, 1)
  }

  with(regex: RegExp | string) {
    return new Pipeline(this.#real, [...this.#filters, { regex: ensureRegex(regex), negate: false }])
  }

  without(regex: RegExp | string) {
    return new Pipeline(this.#real, [...this.#filters, { regex: ensureRegex(regex), negate: true }])
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

  async doAsync(fn: (file: MemFile) => void | Promise<void>) {
    await Promise.all(this.all().map(fn))
  }

  do(fn: (file: MemFile) => void) {
    this.all().map(fn)
  }

  paths() {
    return this.all().map(f => f.path)
  }

  results() {
    return new Map(this.all().map(f => [f.path, f.textOrContent()]))
  }

}

function ensureRegex(s: RegExp | string) {
  return typeof s === 'string' ? new RegExp(s) : s
}
