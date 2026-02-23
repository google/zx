#!/usr/bin/env node
"use strict";
import "./deno.js"
import * as __module__ from "./cli.cjs"
const {
  argv,
  autorun,
  injectGlobalRequire,
  isMain,
  main,
  normalizeExt,
  printUsage,
  transformMarkdown
} = globalThis.Deno ? globalThis.require("./cli.cjs") : __module__
export {
  argv,
  autorun,
  injectGlobalRequire,
  isMain,
  main,
  normalizeExt,
  printUsage,
  transformMarkdown
}

autorun(import.meta)
