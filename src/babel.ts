import type { declare } from '@babel/helper-plugin-utils'
import type { Visitor } from '@babel/traverse'
import { readFileSync } from "node:fs"
import { join } from 'node:path'

export default ((api, opts: { replacements?: Record<string, string> }, dirname) => {
  return transformImportsPlugin(dirname, opts.replacements)
}) as Parameters<typeof declare>[0]

export function transformImportsPlugin(projectRoot: string, replacements?: Record<string, string>) {
  return {
    visitor: {
      ImportDeclaration: {
        enter(path) {
          modifyPath(projectRoot, path.node.source, replacements)
        },
      },
      ExportDeclaration: {
        enter(path) {
          if ('source' in path.node && path.node.source?.value) {
            modifyPath(projectRoot, path.node.source, replacements)
          }
        }
      },
    } as Visitor
  }
}

function modifyPath(projectRoot: string, source: babel.types.StringLiteral, replacements?: Record<string, string>) {
  const dep = source.value
  if (dep.match(/^[./]/) || dep.startsWith('http')) return

  if (replacements && dep in replacements) {
    source.value = replacements[dep]!
    return
  }

  const split = dep.indexOf('/')
  const lib = dep.slice(0, split)
  const imported = dep.slice(split)

  const fullpath = join(projectRoot, 'node_modules', lib, 'package.json')
  const pkgjson = JSON.parse(readFileSync(fullpath, 'utf8'))
  const baseurl = new URL(imported, pkgjson.homepage)

  source.value = baseurl.href
}
