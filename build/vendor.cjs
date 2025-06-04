"use strict";
const {
  __export,
  __reExport,
  __toCommonJS
} = require('./esblib.cjs');


// src/vendor.ts
var vendor_exports = {};
__export(vendor_exports, {
  createRequire: () => import_vendor_extra.createRequire
});
module.exports = __toCommonJS(vendor_exports);
__reExport(vendor_exports, require("./vendor-core.cjs"), module.exports);
__reExport(vendor_exports, require("./vendor-extra.cjs"), module.exports);
var import_vendor_extra = require("./vendor-extra.cjs");
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRequire,
  ...require("./vendor-core.cjs"),
  ...require("./vendor-extra.cjs")
});