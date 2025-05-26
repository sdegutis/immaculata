const UNARY = new Set(["img", "br", "hr", "input", "meta", "link"])

export const jsx = (tag: string | Function, { children, ...attrs }: Record<string, any>) => {
  if (children === null || children === undefined) children = []
  if (!Array.isArray(children)) children = [children]

  if (typeof tag === 'function') {
    return tag({ ...attrs, children })
  }

  const parts: string[] = []

  if (tag === '') {
    pushChildren(children, parts)
    return parts.join('')
  }

  parts.push('<', tag)
  for (const k in attrs) {
    const v = attrs[k]
    if (v === true || v === '')
      parts.push(' ', k)
    else if (v)
      parts.push(' ', k, '="', v, '"')
  }
  parts.push('>')

  if (!UNARY.has(tag)) {
    pushChildren(children, parts)
    parts.push('</', tag, '>')
  }

  return parts.join('')
}

export const jsxs = jsx
export const Fragment = ''

function pushChildren(children: any[], parts: string[]) {
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) {
      if (Array.isArray(child)) {
        pushChildren(child, parts)
      }
      else {
        parts.push(child)
      }
    }
  }
}

declare global {

  namespace JSX {

    type jsxChildren =
      | string
      | false
      | null
      | undefined
      | jsxChildren[]

    type jsxAllowedAttrValues = (string | boolean | null | number)

    type jsxAllowedAttr<T, A extends keyof T & string> =
      A extends 'children' ? never :
      T[A] extends jsxAllowedAttrValues ? Lowercase<A> :
      never

    type jsxify<T> =
      & { [A in keyof T & string as jsxAllowedAttr<T, A>]?: T[A] }
      & { children?: any, class?: string }


    interface ElementChildrenAttribute { children: {} }

    type Element = string

    type ElementType =
      | string
      | ((data: any) => jsxChildren)

    type HtmlElements = {
      [K in keyof HTMLElementTagNameMap]: jsxify<HTMLElementTagNameMap[K]>
    }

  }

}
