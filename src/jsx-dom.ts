export const jsx = (tag: string | Function, fullAttrs: Record<string, any>) => {
  const { children, ...attrs } = fullAttrs

  if (typeof tag === 'function') {
    return tag(attrs ?? {}, children)
  }

  if (tag === '') {
    const goodChildren = getGoodChildren(children)
    if (goodChildren.length === 1) {
      return goodChildren[0]
    }
    const el = document.createDocumentFragment()
    pushChildren(el, goodChildren)
    return el
  }

  const isSvg = svgs.has(tag)
  const el = (isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag))

  pushChildren(el, getGoodChildren(children))

  for (const [key, val] of Object.entries(attrs ?? {})) {
    if (key.startsWith('data-')) {
      el.dataset[key.slice(5)] = val
    }
    else if (isSvg) {
      const jsKey = key.replace(/-\w/, (s) => `${s.toUpperCase()}`)
      el.setAttribute(jsKey, val)
    }
    else {
      const jsKey = replacements[key] ?? key.replace(/-\w/, (s) => `${s.toUpperCase()}`)
      if (isSvg || attributes.has(jsKey)) {
        el.setAttribute(jsKey, val)
      }
      else {
        (el as any)[jsKey] = val
      }
    }
  }
  return el
}

function getGoodChildren(children: any) {
  return [children].flat(Infinity).filter(child => child !== null && child !== undefined && child !== false)
}

function pushChildren(el: DocumentFragment | HTMLElement | SVGElement, children: any[]) {
  for (const child of children) {
    if (child instanceof HTMLLinkElement || child instanceof HTMLStyleElement) {
      document.head.append(child)
    }
    else {
      el.append(child)
    }
  }
}

export const jsxs = jsx
export const Fragment = ''

const replacements: Record<string, string> = {
  "class": 'className',
}

const attributes = new Set(['d', 'viewBox'])
const svgs = new Set(['svg', 'path', 'use'])
