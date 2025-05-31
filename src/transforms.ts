import { readFileSync } from "node:fs"
import { join } from 'node:path'
import ts from 'typescript'

export function transformExternalModuleNames(projectRoot: string, replacements?: Record<string, string>): ts.TransformerFactory<ts.SourceFile> {
  return ctx => node => {
    return ts.visitNode(node, visitor) as ts.SourceFile
    function visitor(node: ts.Node) {
      if (ts.isStringLiteral(node) && node.parent && (
        ts.isImportDeclaration(node.parent) ||
        ts.isExportDeclaration(node.parent) ||
        (ts.isCallExpression(node.parent) && node.parent.expression.getText() === 'import')
      )) {
        return maybeReplace(node, projectRoot, replacements)
      }
      return ts.visitEachChild(node, visitor, ctx)
    }
  }
}

function maybeReplace(node: ts.StringLiteral, projectRoot: string, replacements?: Record<string, string>): ts.StringLiteral {
  const dep = node.text

  if (dep.match(/^[./]/) || dep.startsWith('http')) return node

  if (replacements && dep in replacements) {
    return ts.factory.createStringLiteral(replacements[dep]!)
  }

  let split = dep.indexOf('/')
  if (split === -1) split = dep.length

  const lib = dep.slice(0, split)
  const imported = dep.slice(split)

  if (replacements && lib in replacements) {
    return ts.factory.createStringLiteral(replacements[lib]! + imported)
  }

  const fullpath = join(projectRoot, 'node_modules', lib, 'package.json')
  const pkgjson = JSON.parse(readFileSync(fullpath, 'utf8'))
  const baseurl = new URL(imported, pkgjson.homepage)

  return ts.factory.createStringLiteral(baseurl.href)
}
