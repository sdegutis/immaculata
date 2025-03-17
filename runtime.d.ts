declare namespace JSX {

  type Element = {
    [jsx: symbol]: any,
    [attr: string]: any,
    children?: any,
  }

}

type FsFile = {
  path: string
  content: Buffer | string
  module?: FsModule
}

type FsModule = {
  require(): any
  source: string
  imports: Set<string> | undefined
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
