#!/usr/bin/env node

import { startDevServer } from './dev-server.js'
import { generateFiles } from './file-generator.js'
import { Runtime } from './runtime.js'

const fns = {
  dev: () => startDevServer(new Runtime()),
  generate: () => generateFiles(new Runtime()),
  help: () => console.log("Usage: imlib <dev | generate>"),
}

const usrcmd = (process.argv[2] ?? '') as keyof typeof fns
const cmd = usrcmd in fns ? usrcmd : 'help'
fns[cmd]()
