"use strict";
import "./deno.js"
import * as __module__ from "./goods.cjs"
const {
  argv,
  echo,
  expBackoff,
  fetch,
  parseArgv,
  question,
  retry,
  sleep,
  spinner,
  stdin,
  updateArgv
} = globalThis.Deno ? globalThis.require("./goods.cjs") : __module__
export {
  argv,
  echo,
  expBackoff,
  fetch,
  parseArgv,
  question,
  retry,
  sleep,
  spinner,
  stdin,
  updateArgv
}

