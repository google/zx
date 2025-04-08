"use strict";
const {
  __spreadValues,
  __spreadProps,
  __export,
  __toESM,
  __toCommonJS
} = require('./esblib.cjs');


// src/util.ts
var util_exports = {};
__export(util_exports, {
  bufArrJoin: () => bufArrJoin,
  bufToString: () => bufToString,
  getLast: () => getLast,
  getLines: () => getLines,
  identity: () => identity,
  isString: () => isString,
  isStringLiteral: () => import_vendor_core.isStringLiteral,
  noop: () => noop,
  once: () => once,
  parseBool: () => parseBool,
  parseDuration: () => parseDuration,
  preferLocalBin: () => preferLocalBin,
  proxyOverride: () => proxyOverride,
  quote: () => quote,
  quotePowerShell: () => quotePowerShell,
  randomId: () => randomId,
  tempdir: () => tempdir,
  tempfile: () => tempfile,
  toCamelCase: () => toCamelCase
});
module.exports = __toCommonJS(util_exports);
var import_node_os = __toESM(require("os"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_node_fs = __toESM(require("fs"), 1);
var import_node_process = __toESM(require("process"), 1);
var import_vendor_core = require("./vendor-core.cjs");
function tempdir(prefix = `zx-${randomId()}`, mode) {
  const dirpath = import_node_path.default.join(import_node_os.default.tmpdir(), prefix);
  import_node_fs.default.mkdirSync(dirpath, { recursive: true, mode });
  return dirpath;
}
function tempfile(name, data, mode) {
  const filepath = name ? import_node_path.default.join(tempdir(), name) : import_node_path.default.join(import_node_os.default.tmpdir(), `zx-${randomId()}`);
  if (data === void 0) import_node_fs.default.closeSync(import_node_fs.default.openSync(filepath, "w", mode));
  else import_node_fs.default.writeFileSync(filepath, data, { mode });
  return filepath;
}
function noop() {
}
function identity(v) {
  return v;
}
function randomId() {
  return Math.random().toString(36).slice(2);
}
function isString(obj) {
  return typeof obj === "string";
}
var utf8Decoder = new TextDecoder("utf-8");
var bufToString = (buf) => isString(buf) ? buf : utf8Decoder.decode(buf);
var bufArrJoin = (arr) => arr.reduce((acc, buf) => acc + bufToString(buf), "");
var getLast = (arr) => arr[arr.length - 1];
function preferLocalBin(env, ...dirs) {
  const pathKey = import_node_process.default.platform === "win32" ? Object.keys(env).reverse().find((key) => key.toUpperCase() === "PATH") || "Path" : "PATH";
  const pathValue = dirs.map(
    (c) => c && [
      import_node_path.default.resolve(c, "node_modules", ".bin"),
      import_node_path.default.resolve(c)
    ]
  ).flat().concat(env[pathKey]).filter(Boolean).join(import_node_path.default.delimiter);
  return __spreadProps(__spreadValues({}, env), {
    [pathKey]: pathValue
  });
}
function quote(arg) {
  if (arg === "") return `$''`;
  if (/^[\w/.\-@:=]+$/.test(arg)) return arg;
  return `$'` + arg.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\f/g, "\\f").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\v/g, "\\v").replace(/\0/g, "\\0") + `'`;
}
function quotePowerShell(arg) {
  if (arg === "") return `''`;
  if (/^[\w/.\-]+$/.test(arg)) return arg;
  return `'` + arg.replace(/'/g, "''") + `'`;
}
function parseDuration(d) {
  if (typeof d === "number") {
    if (isNaN(d) || d < 0) throw new Error(`Invalid duration: "${d}".`);
    return d;
  }
  if (/^\d+s$/.test(d)) return +d.slice(0, -1) * 1e3;
  if (/^\d+ms$/.test(d)) return +d.slice(0, -2);
  if (/^\d+m$/.test(d)) return +d.slice(0, -1) * 1e3 * 60;
  throw new Error(`Unknown duration: "${d}".`);
}
var once = (fn) => {
  let called = false;
  let result;
  return (...args) => {
    if (called) return result;
    called = true;
    return result = fn(...args);
  };
};
var proxyOverride = (origin, ...fallbacks) => new Proxy(origin, {
  get(target, key) {
    var _a, _b;
    return (_b = (_a = fallbacks.find((f) => key in f)) == null ? void 0 : _a[key]) != null ? _b : Reflect.get(target, key);
  }
});
var toCamelCase = (str) => str.toLowerCase().replace(/([a-z])[_-]+([a-z])/g, (_, p1, p2) => {
  return p1 + p2.toUpperCase();
});
var parseBool = (v) => {
  var _a;
  return (_a = { true: true, false: false }[v]) != null ? _a : v;
};
var getLines = (chunk, next) => {
  const lines = ((next.pop() || "") + bufToString(chunk)).split(/\r?\n/);
  next.push(lines.pop());
  return lines;
};
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});