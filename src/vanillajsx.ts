import * as babel from '@babel/core'

const t = babel.types

const jsxSymbol = t.callExpression(
  t.memberExpression(
    t.identifier('Symbol'),
    t.identifier('for')
  ),
  [t.stringLiteral('jsx')],
)

const WHITESPACE = /^[ \t]*\n\s*$/

export const babelPluginVanillaJSX: babel.PluginItem = {
  visitor: {
    JSXFragment: {
      enter: (path) => {
        path.node.children = path.node.children.filter(c => c.type !== 'JSXText' || !c.value.match(WHITESPACE))
        const jsx = t.objectExpression([
          t.objectProperty(jsxSymbol, t.stringLiteral(''), true),
        ])
        pushChildren(jsx, path)
        path.replaceWith(jsx)
      },
    },
    JSXElement: {
      enter: (path) => {
        path.node.children = path.node.children.filter(c => c.type !== 'JSXText' || !c.value.match(WHITESPACE))

        let name
        const v = path.node.openingElement.name

        if (v.type === 'JSXMemberExpression')
          name = convertMember(v)
        else if (v.type === 'JSXNamespacedName')
          name = t.stringLiteral(v.namespace.name + ':' + v.name.name)
        else if (v.name.match(/^[A-Z]/))
          name = t.identifier(v.name)
        else
          name = t.stringLiteral(v.name)

        const jsx = t.objectExpression([
          t.objectProperty(jsxSymbol, name, true),
        ])

        if (path.node.openingElement.attributes.length > 0) {
          for (const attr of path.node.openingElement.attributes) {
            if (attr.type === 'JSXSpreadAttribute') {
              jsx.properties.push(t.spreadElement(attr.argument))
              continue
            }

            let key
            if (attr.name.type === 'JSXNamespacedName')
              key = t.stringLiteral(attr.name.namespace.name + ':' + attr.name.name.name)//lol
            else if (attr.name.name.match(/[^\w]/))
              key = t.stringLiteral(attr.name.name)
            else
              key = t.identifier(attr.name.name)

            let val
            if (!attr.value) val = t.booleanLiteral(true)
            else if (attr.value.type === 'StringLiteral') val = t.stringLiteral(attr.value.value)
            else if (attr.value.type === 'JSXElement') val = attr.value
            else if (attr.value.type === 'JSXFragment') val = attr.value
            else if (attr.value.expression.type === 'JSXEmptyExpression') throw val = t.booleanLiteral(true)
            else val = attr.value.expression

            jsx.properties.push(t.objectProperty(key, val))
          }
        }
        pushChildren(jsx, path)
        path.replaceWith(jsx)
      }
    },
  }
}

function pushChildren(parent: babel.types.ObjectExpression, path: babel.NodePath<babel.types.JSXFragment | babel.types.JSXElement>) {
  if (path.node.children.length === 0) return

  const children: (babel.types.Expression | babel.types.SpreadElement)[] = []

  for (const c of path.node.children) {
    if (c.type === 'JSXElement') children.push(c)
    else if (c.type === 'JSXFragment') children.push(c)
    else if (c.type === 'JSXSpreadChild') children.push(t.spreadElement(c.expression))
    else if (c.type === 'JSXText') children.push(t.stringLiteral(trimJsxWhitespace(c.value)))
    else if (c.expression.type !== 'JSXEmptyExpression') children.push(c.expression)
  }

  if (children.length === 1) {
    const child = children[0]!
    if (child.type === 'SpreadElement') {
      parent.properties.push(t.objectProperty(t.identifier("children"), child.argument))
    }
    else {
      parent.properties.push(t.objectProperty(t.identifier("children"), child))
    }
  }
  else if (children.length > 0) {
    parent.properties.push(t.objectProperty(t.identifier("children"), t.arrayExpression(children)))
  }
}

function convertMember(v: babel.types.JSXMemberExpression): babel.types.MemberExpression {
  return t.memberExpression(
    (v.object.type === 'JSXIdentifier'
      ? t.identifier(v.object.name)
      : convertMember(v.object)),
    t.identifier(v.property.name)
  )
}

function trimJsxWhitespace(str: string): string {
  return (str
    .replace(/^ *\n+ */mg, '')
    .replace(/ *\n+ *$/mg, '')
    .replace(/ *\n+ */mg, ' '))
}
