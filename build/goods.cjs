"use strict";
const {
  __pow,
  __spreadValues,
  __export,
  __toESM,
  __toCommonJS,
  __async,
  __forAwait
} = require('./esblib.cjs');


// src/goods.ts
var goods_exports = {};
__export(goods_exports, {
  argv: () => argv,
  echo: () => echo,
  expBackoff: () => expBackoff,
  fetch: () => fetch,
  parseArgv: () => parseArgv,
  question: () => question,
  retry: () => retry,
  sleep: () => sleep,
  spinner: () => spinner,
  stdin: () => stdin,
  updateArgv: () => updateArgv
});
module.exports = __toCommonJS(goods_exports);
var import_node_assert = __toESM(require("assert"), 1);
var import_node_readline = require("readline");
var import_node_stream = require("stream");
var import_core = require("./core.cjs");
var import_util = require("./util.cjs");
var import_vendor = require("./vendor.cjs");
var import_node_buffer = require("buffer");
var import_node_process = __toESM(require("process"), 1);
var parseArgv = (args = import_node_process.default.argv.slice(2), opts = {}, defs = {}) => Object.entries((0, import_vendor.minimist)(args, opts)).reduce(
  (m, [k, v]) => {
    const kTrans = opts.camelCase ? import_util.toCamelCase : import_util.identity;
    const vTrans = opts.parseBoolean ? import_util.parseBool : import_util.identity;
    const [_k, _v] = k === "--" || k === "_" ? [k, v] : [kTrans(k), vTrans(v)];
    m[_k] = _v;
    return m;
  },
  __spreadValues({}, defs)
);
function updateArgv(args, opts) {
  for (const k in argv) delete argv[k];
  Object.assign(argv, parseArgv(args, opts));
}
var argv = parseArgv();
function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, (0, import_util.parseDuration)(duration));
  });
}
var responseToReadable = (response, rs) => {
  var _a;
  const reader = (_a = response.body) == null ? void 0 : _a.getReader();
  if (!reader) {
    rs.push(null);
    return rs;
  }
  rs._read = () => __async(void 0, null, function* () {
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
          var _a;
          return responseToReadable(r, rs).pipe((_a = _dest.run) == null ? void 0 : _a.call(_dest));
        },
        (err) => {
          var _a;
          return (_a = _dest.abort) == null ? void 0 : _a.call(_dest, err);
        }
      );
      return _dest;
    }
  });
}
function echo(pieces, ...args) {
  const lastIdx = pieces.length - 1;
  const msg = (0, import_util.isStringLiteral)(pieces, ...args) ? args.map((a, i) => pieces[i] + stringify(a)).join("") + pieces[lastIdx] : [pieces, ...args].map(stringify).join(" ");
  console.log(msg);
}
function stringify(arg) {
  return arg instanceof import_core.ProcessOutput ? arg.toString().trimEnd() : `${arg}`;
}
function question(query, options) {
  return __async(this, null, function* () {
    let completer = void 0;
    if (options && Array.isArray(options.choices)) {
      completer = function completer2(line) {
        const completions = options.choices;
        const hits = completions.filter((c) => c.startsWith(line));
        return [hits.length ? hits : completions, line];
      };
    }
    const rl = (0, import_node_readline.createInterface)({
      input: import_node_process.default.stdin,
      output: import_node_process.default.stdout,
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
  return __async(this, null, function* () {
    let buf = "";
    import_node_process.default.stdin.setEncoding("utf8");
    try {
      for (var iter = __forAwait(import_node_process.default.stdin), more, temp, error; more = !(temp = yield iter.next()).done; more = false) {
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
function retry(count, a, b) {
  return __async(this, null, function* () {
    const total = count;
    let callback;
    let delayStatic = 0;
    let delayGen;
    if (typeof a === "function") {
      callback = a;
    } else {
      if (typeof a === "object") {
        delayGen = a;
      } else {
        delayStatic = (0, import_util.parseDuration)(a);
      }
      (0, import_node_assert.default)(b);
      callback = b;
    }
    let lastErr;
    let attempt = 0;
    while (count-- > 0) {
      attempt++;
      try {
        return yield callback();
      } catch (err) {
        let delay = 0;
        if (delayStatic > 0) delay = delayStatic;
        if (delayGen) delay = delayGen.next().value;
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
        lastErr = err;
        if (count == 0) break;
        if (delay) yield sleep(delay);
      }
    }
    throw lastErr;
  });
}
function* expBackoff(max = "60s", rand = "100ms") {
  const maxMs = (0, import_util.parseDuration)(max);
  const randMs = (0, import_util.parseDuration)(rand);
  let n = 1;
  while (true) {
    const ms = Math.floor(Math.random() * randMs);
    yield Math.min(__pow(2, n++), maxMs) + ms;
  }
}
function spinner(title, callback) {
  return __async(this, null, function* () {
    if (typeof title === "function") {
      callback = title;
      title = "";
    }
    if (import_core.$.quiet || import_node_process.default.env.CI) return callback();
    let i = 0;
    const spin = () => import_node_process.default.stderr.write(`  ${"\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F"[i++ % 10]} ${title}\r`);
    return (0, import_core.within)(() => __async(this, null, function* () {
      import_core.$.verbose = false;
      const id = setInterval(spin, 100);
      try {
        return yield callback();
      } finally {
        clearInterval(id);
        import_node_process.default.stderr.write(" ".repeat((import_node_process.default.stdout.columns || 1) - 1) + "\r");
      }
    }));
  });
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});