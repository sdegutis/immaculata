type FsFile = {
  path: string
  content: Uint8Array | string
  module?: FsModule
}

type FsModule = {
  require(): any
  source: string
}

declare module '*/' {
  const dir: FsFile[]
  export default dir
}

declare module '*.css' {
  const css: CSSStyleSheet
  export default css
}

declare module 'handlers!' {
  export const handlers: Map<string, (body: string) => string>
  export default handlers
}
