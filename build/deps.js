"use strict";
import "./deno.js"
import * as __module__ from "./deps.cjs"
const {
  installDeps,
  parseDeps
} = globalThis.Deno ? globalThis.require("./deps.cjs") : __module__
export {
  installDeps,
  parseDeps
}

