"use strict";
const {
  __export,
  __toCommonJS
} = require('./esblib.cjs');


// src/internals.ts
var internals_exports = {};
__export(internals_exports, {
  bus: () => bus
});
module.exports = __toCommonJS(internals_exports);
var store = /* @__PURE__ */ new Map();
var override = store.set.bind(store);
var wrap = (name, api) => {
  override(name, api);
  return new Proxy(api, {
    get(_, key) {
      var _a, _b;
      return store.get(name)[key] || ((_b = (_a = store.get(name)) == null ? void 0 : _a.default) == null ? void 0 : _b[key]);
    },
    apply(_, self, args) {
      return store.get(name).apply(self, args);
    }
  });
};
var bus = {
  override,
  store,
  wrap
};
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bus
});