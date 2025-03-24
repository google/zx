"use strict";
const {
  __export,
  __reExport,
  __toCommonJS
} = require('./esblib.cjs');

const import_meta_url =
  typeof document === 'undefined'
    ? new (require('url').URL)('file:' + __filename).href
    : (document.currentScript && document.currentScript.src) ||
      new URL('main.js', document.baseURI).href


// src/index.ts
var index_exports = {};
__export(index_exports, {
  VERSION: () => VERSION,
  YAML: () => import_vendor2.YAML,
  dotenv: () => import_vendor2.dotenv,
  fs: () => import_vendor2.fs,
  glob: () => import_vendor2.glob,
  globby: () => import_vendor2.glob,
  minimist: () => import_vendor2.minimist,
  nothrow: () => nothrow,
  quiet: () => quiet,
  quote: () => import_util.quote,
  quotePowerShell: () => import_util.quotePowerShell,
  tempdir: () => import_util.tempdir,
  tempfile: () => import_util.tempfile,
  tmpdir: () => import_util.tempdir,
  tmpfile: () => import_util.tempfile,
  version: () => version
});
module.exports = __toCommonJS(index_exports);
var import_vendor = require("./vendor.cjs");
__reExport(index_exports, require("./core.cjs"), module.exports);
__reExport(index_exports, require("./goods.cjs"), module.exports);
var import_vendor2 = require("./vendor.cjs");
var import_util = require("./util.cjs");
var import_meta = {};
var VERSION = import_vendor.fs.readJsonSync(
  new URL("../package.json", import_meta_url)
).version;
var version = VERSION;
function nothrow(promise) {
  return promise.nothrow();
}
function quiet(promise) {
  return promise.quiet();
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VERSION,
  YAML,
  dotenv,
  fs,
  glob,
  globby,
  minimist,
  nothrow,
  quiet,
  quote,
  quotePowerShell,
  tempdir,
  tempfile,
  tmpdir,
  tmpfile,
  version,
  ...require("./core.cjs"),
  ...require("./goods.cjs")
});