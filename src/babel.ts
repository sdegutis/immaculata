import type { PluginItem } from '@babel/core'
import { readFileSync } from "node:fs"
import { join } from 'node:path'

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
    }
  } as PluginItem
}

function modifyPath(projectRoot: string, source: babel.types.StringLiteral, replacements?: Record<string, string>) {
  const dep = source.value
  if (dep.match(/^[./]/) || dep.startsWith('http')) return

  if (replacements && dep in replacements) {
    source.value = replacements[dep]!
    return
  }

  let split = dep.indexOf('/')
  if (split === -1) split = dep.length

  const lib = dep.slice(0, split)
  const imported = dep.slice(split)

  if (replacements && lib in replacements) {
    source.value = replacements[lib]! + imported
    return
  }

  const fullpath = join(projectRoot, 'node_modules', lib, 'package.json')
  const pkgjson = JSON.parse(readFileSync(fullpath, 'utf8'))
  const baseurl = new URL(imported, pkgjson.homepage)

  source.value = baseurl.href
}
