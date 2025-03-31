import { createRequire } from "module"
import type { LiveFile, LiveTree } from "./livetree.ts"

export const isArrayFile = /\/.*(?<slug>\[.+\]).*\..+(?<ext>\.tsx?)$/
export const isSingleFile = /\..+(?<ext>\.tsx?)$/

export function processFile(tree: LiveTree, file: LiveFile): LiveFile[] {
  const require = createRequire(tree.base + '/')

  const out: LiveFile[] = []

  let match
  if (match = file.path.match(isArrayFile)) {
    const exportedArray = require('.' + file.path).default as [string, any][]
    for (const [name, content] of exportedArray) {
      const filepath = file.path.replace(match.groups!["slug"]!, name)
      out.push({ path: filepath.slice(0, -match.groups!["ext"]!.length), content })
    }
  }
  else if (match = file.path.match(isSingleFile)) {
    const exportedContent = require('.' + file.path).default
    out.push({ path: file.path.slice(0, -match.groups!["ext"]!.length), content: exportedContent })
  }
  else {
    out.push(file)
  }

  return out
}
