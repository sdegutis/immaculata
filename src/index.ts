import { startDevServer } from './dev-server.ts'
import { generateFiles } from './file-generator.ts'
import { File } from './file.ts'
import * as jsxDomImpl from './jsx-dom.ts'
import * as jsxStringsImpl from './jsx-strings.ts'
import { LiveTree } from './livetree.ts'
import { Module } from './module.ts'
import { Runtime } from './runtime.ts'
import { processFile, processSite } from './ssp.ts'

export default {

  startDevServer,
  generateFiles,
  LiveTree,

  deprecated: {
    Runtime,
    jsxDomImpl,
    jsxStringsImpl,
    Module,
    File,
    processFile,
    processSite,
  }

}
