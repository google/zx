"use strict";
import "./deno.js"
import * as __module__ from "./util.cjs"
const {
  bufArrJoin,
  bufToString,
  getLast,
  getLines,
  identity,
  isString,
  isStringLiteral,
  noop,
  once,
  parseBool,
  parseDuration,
  preferLocalBin,
  proxyOverride,
  quote,
  quotePowerShell,
  randomId,
  tempdir,
  tempfile,
  toCamelCase
} = globalThis.Deno ? globalThis.require("./util.cjs") : __module__
export {
  bufArrJoin,
  bufToString,
  getLast,
  getLines,
  identity,
  isString,
  isStringLiteral,
  noop,
  once,
  parseBool,
  parseDuration,
  preferLocalBin,
  proxyOverride,
  quote,
  quotePowerShell,
  randomId,
  tempdir,
  tempfile,
  toCamelCase
}

