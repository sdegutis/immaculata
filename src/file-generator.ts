import * as fs from 'fs'
import * as path from 'path/posix'

/**
 * Put files from `LiveTree.files` into `<outDir>/**`
 * 
 * `outDir` defaults to `docs` for GH Pages compatibility.
 */
export function generateFiles(out: Map<string, Buffer | string>, dry = false, outDir = 'docs') {
  const madeDirs = new Set<string>()
  const mkdirIfNeeded = (dir: string) => {
    if (madeDirs.has(dir)) return
    madeDirs.add(dir)
    console.log('mkdir', dir)
    if (!dry) fs.mkdirSync(dir)
  }

  for (const [filepath, content] of out) {
    const newFilepath = path.join(outDir, filepath)
    const parts = newFilepath.split(path.sep)
    for (let i = 1; i < parts.length; i++) {
      const dir = path.join(...parts.slice(0, i))
      mkdirIfNeeded(dir)
    }

    console.log('writefile', newFilepath)
    if (!dry) fs.writeFileSync(newFilepath, content)
  }
}
