"use strict";
import "./deno.js"
import * as __module__ from "./vendor.cjs"
const {
  YAML,
  createRequire,
  depseek,
  dotenv,
  fs,
  glob,
  minimist,
  nodeFetch,
  VoidStream,
  buildCmd,
  bus,
  chalk,
  exec,
  isStringLiteral,
  ps,
  which
} = globalThis.Deno ? globalThis.require("./vendor.cjs") : __module__
export {
  YAML,
  createRequire,
  depseek,
  dotenv,
  fs,
  glob,
  minimist,
  nodeFetch,
  VoidStream,
  buildCmd,
  bus,
  chalk,
  exec,
  isStringLiteral,
  ps,
  which
}

