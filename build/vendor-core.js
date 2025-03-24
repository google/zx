"use strict";
import "./deno.js"
import * as __module__ from "./vendor-core.cjs"
const {
  VoidStream,
  buildCmd,
  bus,
  chalk,
  exec,
  isStringLiteral,
  ps,
  which
} = globalThis.Deno ? globalThis.require("./vendor-core.cjs") : __module__
export {
  VoidStream,
  buildCmd,
  bus,
  chalk,
  exec,
  isStringLiteral,
  ps,
  which
}

