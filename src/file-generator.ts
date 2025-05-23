import * as fs from 'fs'
import * as path from 'path'

export function generateFiles(out: Map<string, Buffer | string>, opts?: {
  parent?: string,
  dry?: boolean,
  dir?: string,
}) {
  const dry = opts?.dry ?? false
  const outDir = opts?.dir ?? 'docs'
  const parent = opts?.parent ?? ''

  const madeDirs = new Set<string>()
  const mkdirIfNeeded = (dir: string) => {
    if (madeDirs.has(dir)) return
    if (parent.startsWith(dir)) return
    madeDirs.add(dir)
    console.log('mkdir', dir)
    if (!dry) fs.mkdirSync(dir)
  }

  for (const [filepath, content] of out) {
    const newFilepath = path.posix.join(parent, outDir, filepath)
    const parts = newFilepath.split(path.posix.sep)
    for (let i = 1; i < parts.length; i++) {
      const dir = path.posix.join(...parts.slice(0, i))
      mkdirIfNeeded(dir)
    }

    console.log('writefile', newFilepath)
    if (!dry) fs.writeFileSync(newFilepath, content)
  }
}
