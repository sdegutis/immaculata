#!/usr/bin/env node

import { startDevServer } from './dev-server.ts'
import { generateFiles } from './file-generator.ts'
import { Runtime } from './runtime.ts'

const fns = {
  dev: () => startDevServer(new Runtime()),
  generate: () => generateFiles(new Runtime()),
  help: () => console.log("Usage: immaculata <dev | generate>"),
}

const usrcmd = (process.argv[2] ?? '') as keyof typeof fns
const cmd = usrcmd in fns ? usrcmd : 'help'
fns[cmd]()
