import { Module } from "./module.ts"
import { Runtime } from "./runtime.ts"

export class File implements FsFile {

  module?: Module
  path: string
  content: Uint8Array | string

  constructor(
    path: string,
    content: Uint8Array | string,
    runtime: Runtime,
  ) {
    this.path = path
    this.content = content
    if (path.match(/\.tsx?$/)) {
      const code = typeof content === 'string' ? content : new TextDecoder().decode(content)
      this.module = new Module(code, this.path, runtime)
      this.content = runtime.compiler.compile(code, undefined, path).code
      this.path = convertTsExts(path)
    }
  }

}

export function convertTsExts(path: string) {
  return path.replace(/\.tsx?$/, '.js')
}
