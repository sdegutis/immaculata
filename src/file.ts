import { Module } from "./module.js"
import { Runtime } from "./runtime.js"

export class File implements FsFile {

  module?: Module

  constructor(
    public path: string,
    public content: Uint8Array | string,
    runtime: Runtime,
  ) {
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
