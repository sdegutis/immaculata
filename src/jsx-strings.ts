const UNARY = new Set(["img", "br", "hr", "input", "meta", "link"])

const jsx = Symbol.for('jsx')

export function jsxToString(object: any): string {
  const parts: string[] = []
  push(object, parts)
  return parts.join('')
}

function push(object: any, parts: string[]): void {
  if (typeof object === 'string') {
    parts.push(object)
    return
  }

  if (typeof object === 'undefined' || typeof object === 'boolean' || object === null) {
    return
  }

  if (typeof object !== 'object') {
    parts.push(String(object))
    return
  }

  if (object instanceof Array) {
    for (const child of object) {
      push(child, parts)
    }
    return
  }

  if (!(jsx in object)) {
    parts.push(String(object))
    return
  }

  const tag = object[jsx]
  delete object[jsx]

  if (typeof tag === 'function') {
    return push(tag(object), parts)
  }

  const children = object.children
  delete object.children

  if (tag === '') {
    if (children instanceof Array) {
      for (const child of children) {
        push(child, parts)
      }
    }
    else {
      push(children, parts)
    }
    return
  }

  parts.push('<', tag)
  for (const k in object) {
    const v = object[k]
    if (v === true)
      parts.push(' ', k)
    else if (v)
      parts.push(' ', k, '="', v, '"')
  }
  parts.push('>')

  if (!UNARY.has(tag)) {
    if (children instanceof Array) {
      for (const child of children) {
        push(child, parts)
      }
    }
    else {
      push(children, parts)
    }
    parts.push('</', tag, '>')
  }
}
