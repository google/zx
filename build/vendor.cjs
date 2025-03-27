"use strict";
const {
  __export,
  __reExport,
  __toCommonJS
} = require('./esblib.cjs');


// src/vendor.ts
var vendor_exports = {};
__export(vendor_exports, {
  YAML: () => YAML,
  createRequire: () => import_vendor_extra2.createRequire,
  depseek: () => depseek,
  dotenv: () => dotenv,
  fs: () => fs,
  glob: () => glob,
  minimist: () => minimist,
  nodeFetch: () => nodeFetch
});
module.exports = __toCommonJS(vendor_exports);
var import_vendor_core = require("./vendor-core.cjs");
var import_vendor_extra = require("./vendor-extra.cjs");
__reExport(vendor_exports, require("./vendor-core.cjs"), module.exports);
var import_vendor_extra2 = require("./vendor-extra.cjs");
var { wrap } = import_vendor_core.bus;
var depseek = wrap("depseek", import_vendor_extra.depseek);
var dotenv = wrap("dotenv", import_vendor_extra.dotenv);
var fs = wrap("fs", import_vendor_extra.fs);
var YAML = wrap("YAML", import_vendor_extra.YAML);
var glob = wrap("glob", import_vendor_extra.glob);
var nodeFetch = wrap("nodeFetch", import_vendor_extra.nodeFetch);
var minimist = wrap("minimist", import_vendor_extra.minimist);
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  YAML,
  createRequire,
  depseek,
  dotenv,
  fs,
  glob,
  minimist,
  nodeFetch,
  ...require("./vendor-core.cjs")
});