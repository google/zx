"use strict";
const {
  __export,
  __toCommonJS,
  __async
} = require('./esblib.cjs');


// src/deps.ts
var deps_exports = {};
__export(deps_exports, {
  installDeps: () => installDeps,
  parseDeps: () => parseDeps
});
module.exports = __toCommonJS(deps_exports);
var import_index = require("./index.cjs");
var import_vendor = require("./vendor.cjs");
function installDeps(dependencies, prefix, registry) {
  return __async(this, null, function* () {
    const prefixFlag = prefix ? `--prefix=${prefix}` : "";
    const registryFlag = registry ? `--registry=${registry}` : "";
    const packages = Object.entries(dependencies).map(
      ([name, version]) => `${name}@${version}`
    );
    if (packages.length === 0) {
      return;
    }
    yield (0, import_index.spinner)(
      `npm i ${packages.join(" ")}`,
      () => import_index.$`npm install --no-save --no-audit --no-fund ${registryFlag} ${prefixFlag} ${packages}`.nothrow()
    );
  });
}
var builtins = /* @__PURE__ */ new Set([
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
]);
var nameRe = new RegExp("^(?<name>(@[a-z\\d-~][\\w-.~]*\\/)?[a-z\\d-~][\\w-.~]*)\\/?.*$", "i");
var versionRe = new RegExp("^@(?<version>[~^]?(v?[\\dx*]+([-.][\\d*a-z-]+)*))", "i");
function parseDeps(content) {
  return (0, import_vendor.depseek)(content + "\n", { comments: true }).reduce((m, { type, value }, i, list) => {
    if (type === "dep") {
      const meta = list[i + 1];
      const name = parsePackageName(value);
      const version = (meta == null ? void 0 : meta.type) === "comment" && parseVersion(meta == null ? void 0 : meta.value.trim()) || "latest";
      if (name) m[name] = version;
    }
    return m;
  }, {});
}
function parsePackageName(path) {
  var _a, _b;
  if (!path) return;
  const name = (_b = (_a = nameRe.exec(path)) == null ? void 0 : _a.groups) == null ? void 0 : _b.name;
  if (name && !builtins.has(name)) {
    return name;
  }
}
function parseVersion(line) {
  var _a, _b;
  return ((_b = (_a = versionRe.exec(line)) == null ? void 0 : _a.groups) == null ? void 0 : _b.version) || "latest";
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installDeps,
  parseDeps
});