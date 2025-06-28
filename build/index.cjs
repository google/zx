"use strict";
const {
  __pow,
  __export,
  __reExport,
  __toESM,
  __toCommonJS,
  __async,
  __forAwait
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
  YAML: () => import_vendor3.YAML,
  argv: () => argv,
  dotenv: () => import_vendor3.dotenv,
  echo: () => echo,
  expBackoff: () => expBackoff,
  fetch: () => fetch,
  fs: () => import_vendor3.fs,
  glob: () => import_vendor3.glob,
  globby: () => import_vendor3.glob,
  minimist: () => import_vendor3.minimist,
  nothrow: () => nothrow,
  parseArgv: () => parseArgv,
  question: () => question,
  quiet: () => quiet,
  quote: () => import_util2.quote,
  quotePowerShell: () => import_util2.quotePowerShell,
  retry: () => retry,
  sleep: () => sleep,
  spinner: () => spinner,
  stdin: () => stdin,
  tempdir: () => import_util2.tempdir,
  tempfile: () => import_util2.tempfile,
  tmpdir: () => import_util2.tempdir,
  tmpfile: () => import_util2.tempfile,
  updateArgv: () => updateArgv,
  version: () => version
});
module.exports = __toCommonJS(index_exports);
var import_vendor2 = require("./vendor.cjs");
__reExport(index_exports, require("./core.cjs"), module.exports);

// src/goods.ts
var import_node_buffer = require("buffer");
var import_node_process = __toESM(require("process"), 1);
var import_node_readline = require("readline");
var import_node_stream = require("stream");
var import_core = require("./core.cjs");
var import_util = require("./util.cjs");
var import_vendor = require("./vendor.cjs");
var parseArgv = (args = import_node_process.default.argv.slice(2), opts = {}, defs = {}) => Object.entries((0, import_vendor.minimist)(args, opts)).reduce(
  (m, [k, v]) => {
    const kTrans = opts.camelCase ? import_util.toCamelCase : import_util.identity;
    const vTrans = opts.parseBoolean ? import_util.parseBool : import_util.identity;
    const [_k, _v] = k === "--" || k === "_" ? [k, v] : [kTrans(k), vTrans(v)];
    m[_k] = _v;
    return m;
  },
  defs
);
function updateArgv(args, opts) {
  for (const k in argv) delete argv[k];
  parseArgv(args, opts, argv);
}
var argv = parseArgv();
function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, (0, import_util.parseDuration)(duration));
  });
}
var responseToReadable = (response, rs) => {
  var _a2;
  const reader = (_a2 = response.body) == null ? void 0 : _a2.getReader();
  if (!reader) {
    rs.push(null);
    return rs;
  }
  rs._read = () => __async(null, null, function* () {
    const result = yield reader.read();
    if (!result.done) rs.push(import_node_buffer.Buffer.from(result.value));
    else rs.push(null);
  });
  return rs;
};
function fetch(url, init) {
  import_core.$.log({ kind: "fetch", url, init, verbose: !import_core.$.quiet && import_core.$.verbose });
  const p = (0, import_vendor.nodeFetch)(url, init);
  return Object.assign(p, {
    pipe(dest, ...args) {
      const rs = new import_node_stream.Readable();
      const _dest = (0, import_util.isStringLiteral)(dest, ...args) ? (0, import_core.$)({
        halt: true,
        signal: init == null ? void 0 : init.signal
      })(dest, ...args) : dest;
      p.then(
        (r) => {
          var _a2;
          return responseToReadable(r, rs).pipe((_a2 = _dest.run) == null ? void 0 : _a2.call(_dest));
        },
        (err) => {
          var _a2;
          return (_a2 = _dest.abort) == null ? void 0 : _a2.call(_dest, err);
        }
      );
      return _dest;
    }
  });
}
function echo(pieces, ...args) {
  const msg = (0, import_util.isStringLiteral)(pieces, ...args) ? args.map((a, i) => pieces[i] + stringify(a)).join("") + (0, import_util.getLast)(pieces) : [pieces, ...args].map(stringify).join(" ");
  console.log(msg);
}
function stringify(arg) {
  return arg instanceof import_core.ProcessOutput ? arg.toString().trimEnd() : `${arg}`;
}
function question(_0) {
  return __async(this, arguments, function* (query, {
    choices,
    input = import_node_process.default.stdin,
    output = import_node_process.default.stdout
  } = {}) {
    let completer = void 0;
    if (Array.isArray(choices)) {
      completer = function completer2(line) {
        const hits = choices.filter((c) => c.startsWith(line));
        return [hits.length ? hits : choices, line];
      };
    }
    const rl = (0, import_node_readline.createInterface)({
      input,
      output,
      terminal: true,
      completer
    });
    return new Promise(
      (resolve) => rl.question(query != null ? query : "", (answer) => {
        rl.close();
        resolve(answer);
      })
    );
  });
}
function stdin() {
  return __async(this, arguments, function* (stream = import_node_process.default.stdin) {
    let buf = "";
    stream.setEncoding("utf8");
    try {
      for (var iter = __forAwait(stream), more, temp, error; more = !(temp = yield iter.next()).done; more = false) {
        const chunk = temp.value;
        buf += chunk;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && (yield temp.call(iter));
      } finally {
        if (error)
          throw error[0];
      }
    }
    return buf;
  });
}
function retry(count, d, cb) {
  return __async(this, null, function* () {
    if (typeof d === "function") return retry(count, 0, d);
    if (!cb) throw new Error("Callback is required for retry");
    const total = count;
    const gen = typeof d === "object" ? d : function* (d2) {
      while (true) yield d2;
    }((0, import_util.parseDuration)(d));
    let attempt = 0;
    let lastErr;
    while (count-- > 0) {
      attempt++;
      try {
        return yield cb();
      } catch (err) {
        lastErr = err;
        const delay = gen.next().value;
        import_core.$.log({
          kind: "retry",
          total,
          attempt,
          delay,
          exception: err,
          verbose: !import_core.$.quiet && import_core.$.verbose,
          error: `FAIL Attempt: ${attempt}/${total}, next: ${delay}`
          // legacy
        });
        if (delay > 0) yield sleep(delay);
      }
    }
    throw lastErr;
  });
}
function* expBackoff(max = "60s", delay = "100ms") {
  const maxMs = (0, import_util.parseDuration)(max);
  const randMs = (0, import_util.parseDuration)(delay);
  let n = 0;
  while (true) {
    yield Math.min(randMs * __pow(2, n++), maxMs);
  }
}
function spinner(title, callback) {
  return __async(this, null, function* () {
    if (typeof title === "function") return spinner("", title);
    if (import_core.$.quiet || import_node_process.default.env.CI) return callback();
    let i = 0;
    const stream = import_core.$.log.output || import_node_process.default.stderr;
    const spin = () => stream.write(`  ${"\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F"[i++ % 10]} ${title}\r`);
    return (0, import_core.within)(() => __async(null, null, function* () {
      import_core.$.verbose = false;
      const id = setInterval(spin, 100);
      try {
        return yield callback();
      } finally {
        clearInterval(id);
        stream.write(" ".repeat((import_node_process.default.stdout.columns || 1) - 1) + "\r");
      }
    }));
  });
}

// src/index.ts
var import_vendor3 = require("./vendor.cjs");
var import_util2 = require("./util.cjs");
var import_meta = {};
var _a;
var VERSION = ((_a = import_vendor2.fs.readJsonSync(new URL("../package.json", import_meta_url), {
  throws: false
})) == null ? void 0 : _a.version) || URL.parse(import_meta_url).pathname.split("/")[3];
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
  argv,
  dotenv,
  echo,
  expBackoff,
  fetch,
  fs,
  glob,
  globby,
  minimist,
  nothrow,
  parseArgv,
  question,
  quiet,
  quote,
  quotePowerShell,
  retry,
  sleep,
  spinner,
  stdin,
  tempdir,
  tempfile,
  tmpdir,
  tmpfile,
  updateArgv,
  version,
  ...require("./core.cjs")
});