import { createRequire } from "module"
import type { LiveFile, LiveTree } from "./livetree.ts"

export const isArrayFile = /\/.*(?<slug>\[.+\]).*\..+\.tsx?$/
export const isSingleFile = /\..+\.tsx?$/

export function processFile(tree: LiveTree, file: LiveFile): LiveFile[] {
  console.log(tree.base)
  const require = createRequire(tree.base + '/')

  const out: LiveFile[] = []

  let match
  if (match = file.path.match(isArrayFile)) {
    const exportedArray = require('.' + file.path).default as [string, any][]
    for (const [name, content] of exportedArray) {
      const filepath = file.path.replace(match.groups!["slug"]!, name)
      out.push({ path: filepath.slice(0, -3), content })
    }
  }
  else if (file.path.match(isSingleFile)) {
    const exportedContent = require('.' + file.path).default
    out.push({ path: file.path.slice(0, -3), content: exportedContent })
  }
  else {
    out.push(file)
  }

  return out
}
