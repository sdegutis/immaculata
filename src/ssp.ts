import type { LiveFile } from "./livetree.ts"

export const isArrayFile = /\/.*(?<slug>\[.+\]).*\..+\.js$/
export const isSingleFile = /\..+\.js$/

export function processFile(file: LiveFile): LiveFile[] {
  const out: LiveFile[] = []

  // let match
  // if (match = file.path.match(isArrayFile)) {
  //   const exportedArray = file.module!.require().default as [string, any][]
  //   for (const [name, content] of exportedArray) {
  //     const filepath = file.path.replace(match.groups!["slug"]!, name)
  //     out.push({ path: filepath.slice(0, -3), content })
  //   }
  // }
  // else if (file.path.match(isSingleFile)) {
  //   const exportedContent = file.module!.require().default
  //   out.push({ path: file.path.slice(0, -3), content: exportedContent })
  // }
  // else {
  //   out.push(file)
  // }

  return out
}
