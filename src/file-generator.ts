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
    madeDirs.add(dir)
    console.log('mkdir', dir)
    if (!dry) fs.mkdirSync(dir)
  }

  for (const [filepath, content] of out) {
    const relfile = path.join(outDir, filepath)
    const parts = relfile.split(path.sep)
    for (let i = 1; i < parts.length; i++) {
      const dir = path.join(parent, ...parts.slice(0, i))
      mkdirIfNeeded(dir)
    }

    const absfile = path.join(parent, relfile)
    console.log('writefile', absfile)
    if (!dry) fs.writeFileSync(absfile, content)
  }
}
