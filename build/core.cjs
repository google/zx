"use strict";
const {
  __spreadValues,
  __export,
  __toESM,
  __toCommonJS,
  __async,
  __await,
  __asyncGenerator,
  __yieldStar,
  __forAwait
} = require('./esblib.cjs');


// src/core.ts
var core_exports = {};
__export(core_exports, {
  $: () => $,
  ProcessOutput: () => ProcessOutput,
  ProcessPromise: () => ProcessPromise,
  cd: () => cd,
  chalk: () => import_vendor_core3.chalk,
  defaults: () => defaults,
  kill: () => kill,
  log: () => log,
  os: () => os,
  path: () => import_node_path.default,
  ps: () => import_vendor_core3.ps,
  quote: () => import_util2.quote,
  quotePowerShell: () => import_util2.quotePowerShell,
  resolveDefaults: () => resolveDefaults,
  syncProcessCwd: () => syncProcessCwd,
  useBash: () => useBash,
  usePowerShell: () => usePowerShell,
  usePwsh: () => usePwsh,
  which: () => import_vendor_core3.which,
  within: () => within
});
module.exports = __toCommonJS(core_exports);
var import_node_child_process = require("child_process");
var import_node_async_hooks = require("async_hooks");
var import_node_fs = __toESM(require("fs"), 1);
var import_node_util2 = require("util");
var import_node_os = require("os");
var import_node_events = require("events");
var import_node_buffer = require("buffer");
var import_node_process2 = __toESM(require("process"), 1);

// src/error.ts
var EXIT_CODES = {
  2: "Misuse of shell builtins",
  126: "Invoked command cannot execute",
  127: "Command not found",
  128: "Invalid exit argument",
  129: "Hangup",
  130: "Interrupt",
  131: "Quit and dump core",
  132: "Illegal instruction",
  133: "Trace/breakpoint trap",
  134: "Process aborted",
  135: 'Bus error: "access to undefined portion of memory object"',
  136: 'Floating point exception: "erroneous arithmetic operation"',
  137: "Kill (terminate immediately)",
  138: "User-defined 1",
  139: "Segmentation violation",
  140: "User-defined 2",
  141: "Write to pipe with no one reading",
  142: "Signal raised by alarm",
  143: "Termination (request to terminate)",
  145: "Child process terminated, stopped (or continued*)",
  146: "Continue if stopped",
  147: "Stop executing temporarily",
  148: "Terminal stop signal",
  149: 'Background process attempting to read from tty ("in")',
  150: 'Background process attempting to write to tty ("out")',
  151: "Urgent data available on socket",
  152: "CPU time limit exceeded",
  153: "File size limit exceeded",
  154: 'Signal raised by timer counting virtual time: "virtual timer expired"',
  155: "Profiling timer expired",
  157: "Pollable event",
  159: "Bad syscall"
};
var ERRNO_CODES = {
  0: "Success",
  1: "Not super-user",
  2: "No such file or directory",
  3: "No such process",
  4: "Interrupted system call",
  5: "I/O error",
  6: "No such device or address",
  7: "Arg list too long",
  8: "Exec format error",
  9: "Bad file number",
  10: "No children",
  11: "No more processes",
  12: "Not enough core",
  13: "Permission denied",
  14: "Bad address",
  15: "Block device required",
  16: "Mount device busy",
  17: "File exists",
  18: "Cross-device link",
  19: "No such device",
  20: "Not a directory",
  21: "Is a directory",
  22: "Invalid argument",
  23: "Too many open files in system",
  24: "Too many open files",
  25: "Not a typewriter",
  26: "Text file busy",
  27: "File too large",
  28: "No space left on device",
  29: "Illegal seek",
  30: "Read only file system",
  31: "Too many links",
  32: "Broken pipe",
  33: "Math arg out of domain of func",
  34: "Math result not representable",
  35: "File locking deadlock error",
  36: "File or path name too long",
  37: "No record locks available",
  38: "Function not implemented",
  39: "Directory not empty",
  40: "Too many symbolic links",
  42: "No message of desired type",
  43: "Identifier removed",
  44: "Channel number out of range",
  45: "Level 2 not synchronized",
  46: "Level 3 halted",
  47: "Level 3 reset",
  48: "Link number out of range",
  49: "Protocol driver not attached",
  50: "No CSI structure available",
  51: "Level 2 halted",
  52: "Invalid exchange",
  53: "Invalid request descriptor",
  54: "Exchange full",
  55: "No anode",
  56: "Invalid request code",
  57: "Invalid slot",
  59: "Bad font file fmt",
  60: "Device not a stream",
  61: "No data (for no delay io)",
  62: "Timer expired",
  63: "Out of streams resources",
  64: "Machine is not on the network",
  65: "Package not installed",
  66: "The object is remote",
  67: "The link has been severed",
  68: "Advertise error",
  69: "Srmount error",
  70: "Communication error on send",
  71: "Protocol error",
  72: "Multihop attempted",
  73: "Cross mount point (not really error)",
  74: "Trying to read unreadable message",
  75: "Value too large for defined data type",
  76: "Given log. name not unique",
  77: "f.d. invalid for this operation",
  78: "Remote address changed",
  79: "Can   access a needed shared lib",
  80: "Accessing a corrupted shared lib",
  81: ".lib section in a.out corrupted",
  82: "Attempting to link in too many libs",
  83: "Attempting to exec a shared library",
  84: "Illegal byte sequence",
  86: "Streams pipe error",
  87: "Too many users",
  88: "Socket operation on non-socket",
  89: "Destination address required",
  90: "Message too long",
  91: "Protocol wrong type for socket",
  92: "Protocol not available",
  93: "Unknown protocol",
  94: "Socket type not supported",
  95: "Not supported",
  96: "Protocol family not supported",
  97: "Address family not supported by protocol family",
  98: "Address already in use",
  99: "Address not available",
  100: "Network interface is not configured",
  101: "Network is unreachable",
  102: "Connection reset by network",
  103: "Connection aborted",
  104: "Connection reset by peer",
  105: "No buffer space available",
  106: "Socket is already connected",
  107: "Socket is not connected",
  108: "Can't send after socket shutdown",
  109: "Too many references",
  110: "Connection timed out",
  111: "Connection refused",
  112: "Host is down",
  113: "Host is unreachable",
  114: "Socket already connected",
  115: "Connection already in progress",
  116: "Stale file handle",
  122: "Quota exceeded",
  123: "No medium (in tape drive)",
  125: "Operation canceled",
  130: "Previous owner died",
  131: "State not recoverable"
};
function getErrnoMessage(errno) {
  return ERRNO_CODES[-errno] || "Unknown error";
}
var getExitCodeInfo = (exitCode) => EXIT_CODES[exitCode];
var formatExitMessage = (code, signal, stderr, from, details = "") => {
  if (code == 0 && signal == null) return `exit code: ${code}`;
  const codeInfo = getExitCodeInfo(code);
  let message = `${stderr}
    at ${from}
    exit code: ${code}${codeInfo ? " (" + codeInfo + ")" : ""}`;
  if (signal != null) message += `
    signal: ${signal}`;
  if (details) message += `
    details: 
${details}`;
  return message;
};
var formatErrorMessage = (err, from) => {
  return `${err.message}
    errno: ${err.errno} (${getErrnoMessage(err.errno)})
    code: ${err.code}
    at ${from}`;
};
function getCallerLocation(err = new Error("zx error")) {
  return getCallerLocationFromString(err.stack);
}
function getCallerLocationFromString(stackString = "unknown") {
  const lines = stackString.split(/^\s*(at\s)?/m).filter((s) => s == null ? void 0 : s.includes(":"));
  const i = lines.findIndex((l) => l.includes("Proxy.set"));
  const offset = i < 0 ? i : i + 2;
  return (lines.find((l) => l.includes("file://")) || lines[offset] || stackString).trim();
}
var formatErrorDetails = (lines = [], lim = 20) => {
  if (lines.length < lim) return lines.join("\n");
  let errors = lines.filter((l) => /(fail|error|not ok|exception)/i.test(l));
  if (errors.length === 0) errors = lines;
  return errors.slice(0, lim).join("\n") + (errors.length > lim ? "\n..." : "");
};

// src/core.ts
var import_vendor_core2 = require("./vendor-core.cjs");
var import_util = require("./util.cjs");

// src/log.ts
var import_vendor_core = require("./vendor-core.cjs");
var import_node_util = require("util");
var import_node_process = __toESM(require("process"), 1);
var formatters = {
  cmd({ cmd }) {
    return formatCmd(cmd);
  },
  stdout({ data }) {
    return data;
  },
  stderr({ data }) {
    return data;
  },
  custom({ data }) {
    return data;
  },
  fetch(entry) {
    const init = entry.init ? " " + (0, import_node_util.inspect)(entry.init) : "";
    return `$ ${import_vendor_core.chalk.greenBright("fetch")} ${entry.url}${init}
`;
  },
  cd(entry) {
    return `$ ${import_vendor_core.chalk.greenBright("cd")} ${entry.dir}
`;
  },
  retry(entry) {
    const attempt = `Attempt: ${entry.attempt}${entry.total == Infinity ? "" : `/${entry.total}`}`;
    const delay = entry.delay > 0 ? `; next in ${entry.delay}ms` : "";
    return `${import_vendor_core.chalk.bgRed.white(" FAIL ")} ${attempt}${delay}
`;
  },
  end() {
    return "";
  }
};
var log = function(entry) {
  var _a;
  if (!entry.verbose) return;
  const stream = log.output || import_node_process.default.stderr;
  const format = ((_a = log.formatters) == null ? void 0 : _a[entry.kind]) || formatters[entry.kind];
  if (!format) return;
  stream.write(format(entry));
};
var SPACE_RE = /\s/;
var SYNTAX = "()[]{}<>;:+|&=";
var CMD_BREAK = "|&;><";
var RESERVED_WORDS = /* @__PURE__ */ new Set([
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "case",
  "esac",
  "for",
  "select",
  "while",
  "until",
  "do",
  "done",
  "in",
  "EOF"
]);
function formatCmd(cmd) {
  if (cmd == void 0) return import_vendor_core.chalk.grey("undefined");
  let q = "";
  let out = "$ ";
  let buf = "";
  let mode = "";
  let pos = 0;
  const cap = () => {
    const word = buf.trim();
    if (word) {
      pos++;
      if (mode === "syntax") {
        if (CMD_BREAK.includes(word)) {
          pos = 0;
        }
        out += import_vendor_core.chalk.red(buf);
      } else if (mode === "quote" || mode === "dollar") {
        out += import_vendor_core.chalk.yellowBright(buf);
      } else if (RESERVED_WORDS.has(word)) {
        out += import_vendor_core.chalk.cyanBright(buf);
      } else if (pos === 1) {
        out += import_vendor_core.chalk.greenBright(buf);
        pos = Infinity;
      } else {
        out += buf;
      }
    } else {
      out += buf;
    }
    mode = "";
    buf = "";
  };
  for (const c of [...cmd]) {
    if (!q) {
      if (c === "$") {
        cap();
        mode = "dollar";
        buf += c;
        cap();
      } else if (c === "'" || c === '"') {
        cap();
        mode = "quote";
        q = c;
        buf += c;
      } else if (SPACE_RE.test(c)) {
        cap();
        buf += c;
      } else if (SYNTAX.includes(c)) {
        const isEnv = c === "=" && pos === 0;
        isEnv && (pos = 1);
        cap();
        mode = "syntax";
        buf += c;
        cap();
        isEnv && (pos = -1);
      } else {
        buf += c;
      }
    } else {
      buf += c;
      if (c === q) {
        cap();
        q = "";
      }
    }
  }
  cap();
  return out.replaceAll("\n", import_vendor_core.chalk.reset("\n> ")) + "\n";
}

// src/core.ts
var import_node_path = __toESM(require("path"), 1);
var os = __toESM(require("os"), 1);
var import_vendor_core3 = require("./vendor-core.cjs");
var import_util2 = require("./util.cjs");
var CWD = Symbol("processCwd");
var SYNC = Symbol("syncExec");
var EOL = import_node_buffer.Buffer.from(import_node_os.EOL);
var BR_CC = "\n".charCodeAt(0);
var DLMTR = /\r?\n/;
var SIGTERM = "SIGTERM";
var ENV_PREFIX = "ZX_";
var ENV_OPTS = /* @__PURE__ */ new Set([
  "cwd",
  "preferLocal",
  "detached",
  "verbose",
  "quiet",
  "timeout",
  "timeoutSignal",
  "killSignal",
  "prefix",
  "postfix",
  "shell"
]);
var storage = new import_node_async_hooks.AsyncLocalStorage();
function getStore() {
  return storage.getStore() || defaults;
}
function within(callback) {
  return storage.run(__spreadValues({}, getStore()), callback);
}
var defaults = resolveDefaults({
  [CWD]: import_node_process2.default.cwd(),
  [SYNC]: false,
  verbose: false,
  env: import_node_process2.default.env,
  sync: false,
  shell: import_node_process2.default.env.SHELL || true,
  stdio: "pipe",
  nothrow: false,
  quiet: false,
  prefix: "",
  postfix: "",
  detached: false,
  preferLocal: false,
  spawn: import_node_child_process.spawn,
  spawnSync: import_node_child_process.spawnSync,
  log,
  kill,
  killSignal: SIGTERM,
  timeoutSignal: SIGTERM
});
var boundCtxs = [];
var delimiters = [];
var $ = new Proxy(
  function(pieces, ...args) {
    const snapshot = getStore();
    if (!Array.isArray(pieces)) {
      return function(...args2) {
        const self = this;
        return within(
          () => Object.assign($, snapshot, pieces).apply(self, args2)
        );
      };
    }
    const from = getCallerLocation();
    if (pieces.some((p) => p == void 0))
      throw new Error(`Malformed command at ${from}`);
    checkShell();
    checkQuote();
    const cmd = (0, import_vendor_core2.buildCmd)(
      $.quote,
      pieces,
      args
    );
    const sync = snapshot[SYNC];
    boundCtxs.push([cmd, from, snapshot]);
    const process3 = new ProcessPromise(import_util.noop);
    if (!process3.isHalted() || sync) process3.run();
    return sync ? process3.output : process3;
  },
  {
    set(_, key, value) {
      const target = key in Function.prototype ? _ : getStore();
      Reflect.set(target, key === "sync" ? SYNC : key, value);
      return true;
    },
    get(_, key) {
      if (key === "sync") return $({ sync: true });
      const target = key in Function.prototype ? _ : getStore();
      return Reflect.get(target, key);
    }
  }
);
var _ProcessPromise = class _ProcessPromise extends Promise {
  constructor(executor) {
    let resolve;
    let reject;
    super((...args) => {
      ;
      [resolve, reject] = args;
      executor(...args);
    });
    this._stage = "initial";
    this._id = (0, import_util.randomId)();
    this._command = "";
    this._from = "";
    this._snapshot = getStore();
    this._piped = false;
    this._ee = new import_node_events.EventEmitter();
    this._stdin = new import_vendor_core2.VoidStream();
    this._zurk = null;
    this._output = null;
    this._reject = import_util.noop;
    this._resolve = import_util.noop;
    // Stream-like API
    this.writable = true;
    if (boundCtxs.length) {
      const [cmd, from, snapshot] = boundCtxs.pop();
      this._command = cmd;
      this._from = from;
      this._resolve = resolve;
      this._reject = (v) => {
        reject(v);
        if (snapshot[SYNC]) throw v;
      };
      this._snapshot = __spreadValues({ ac: new AbortController() }, snapshot);
      if (this._snapshot.halt) this._stage = "halted";
    } else _ProcessPromise.disarm(this);
  }
  run() {
    var _a, _b, _c, _d, _e, _f, _g;
    if (this.isRunning() || this.isSettled()) return this;
    this._stage = "running";
    (_a = this._pipedFrom) == null ? void 0 : _a.run();
    const self = this;
    const $2 = self._snapshot;
    const id = self.id;
    const sync = $2[SYNC];
    const timeout = (_b = self._timeout) != null ? _b : $2.timeout;
    const timeoutSignal = (_c = self._timeoutSignal) != null ? _c : $2.timeoutSignal;
    if ($2.preferLocal) {
      const dirs = $2.preferLocal === true ? [$2.cwd, $2[CWD]] : [$2.preferLocal].flat();
      $2.env = (0, import_util.preferLocalBin)($2.env, ...dirs);
    }
    this._zurk = (0, import_vendor_core2.exec)({
      sync,
      id,
      cmd: self.fullCmd,
      cwd: (_d = $2.cwd) != null ? _d : $2[CWD],
      input: (_f = (_e = $2.input) == null ? void 0 : _e.stdout) != null ? _f : $2.input,
      ac: $2.ac,
      signal: $2.signal,
      shell: (0, import_util.isString)($2.shell) ? $2.shell : true,
      env: $2.env,
      spawn: $2.spawn,
      spawnSync: $2.spawnSync,
      store: $2.store,
      stdin: self._stdin,
      stdio: (_g = self._stdio) != null ? _g : $2.stdio,
      detached: $2.detached,
      ee: self._ee,
      run(cb, ctx) {
        var _a2, _b2;
        ((_b2 = (_a2 = self.cmd).then) == null ? void 0 : _b2.call(_a2, (_cmd) => {
          self._command = _cmd;
          ctx.cmd = self.fullCmd;
          cb();
        }, (error) => {
          ctx.on.end({ error, status: null, signal: null, duration: 0, ctx }, ctx);
        })) || cb();
      },
      on: {
        start: () => {
          $2.log({ kind: "cmd", cmd: self.cmd, verbose: self.isVerbose(), id });
          !sync && timeout && self.timeout(timeout, timeoutSignal);
        },
        stdout: (data) => {
          if (self._piped) return;
          $2.log({ kind: "stdout", data, verbose: self.isVerbose(), id });
        },
        stderr: (data) => {
          $2.log({ kind: "stderr", data, verbose: !self.isQuiet(), id });
        },
        end: (data, c) => {
          const { error, status, signal, duration, ctx: { store } } = data;
          const { stdout, stderr } = store;
          const output = self._output = new ProcessOutput({
            code: status,
            signal,
            error,
            duration,
            store,
            from: self._from
          });
          $2.log({ kind: "end", signal, exitCode: status, duration, error, verbose: self.isVerbose(), id });
          if (stdout.length && (0, import_util.getLast)((0, import_util.getLast)(stdout)) !== BR_CC) c.on.stdout(EOL, c);
          if (stderr.length && (0, import_util.getLast)((0, import_util.getLast)(stderr)) !== BR_CC) c.on.stderr(EOL, c);
          if (!output.ok && !self.isNothrow()) {
            self._stage = "rejected";
            self._reject(output);
          } else {
            self._stage = "fulfilled";
            self._resolve(output);
          }
        }
      }
    });
    return this;
  }
  _pipe(source, dest, ...args) {
    if ((0, import_util.isStringLiteral)(dest, ...args))
      return this.pipe[source](
        $({
          halt: true,
          ac: this._snapshot.ac,
          signal: this._snapshot.signal
        })(dest, ...args)
      );
    this._piped = true;
    const ee = this._ee;
    const from = new import_vendor_core2.VoidStream();
    const fill = () => {
      for (const chunk of this._zurk.store[source]) from.write(chunk);
      return true;
    };
    const fillEnd = () => this.isSettled() && fill() && from.end();
    if (!this.isSettled()) {
      const onData = (chunk) => from.write(chunk);
      ee.once(source, () => {
        fill();
        ee.on(source, onData);
      }).once("end", () => {
        ee.removeListener(source, onData);
        from.end();
      });
    }
    if ((0, import_util.isString)(dest)) dest = import_node_fs.default.createWriteStream(dest);
    if (dest instanceof _ProcessPromise) {
      dest._pipedFrom = this;
      if (dest.isHalted() && this.isHalted()) {
        ee.once("start", () => from.pipe(dest.run()._stdin));
      } else {
        this.catch((e) => dest.isNothrow() ? import_util.noop : dest._reject(e));
        from.pipe(dest.run()._stdin);
      }
      fillEnd();
      return dest;
    }
    from.once("end", () => dest.emit("end-piped-from")).pipe(dest);
    fillEnd();
    return promisifyStream(dest, this);
  }
  abort(reason) {
    var _a, _b;
    if (this.signal !== ((_a = this._snapshot.ac) == null ? void 0 : _a.signal))
      throw new Error("The signal is controlled by another process.");
    if (!this.child)
      throw new Error("Trying to abort a process without creating one.");
    (_b = this._zurk) == null ? void 0 : _b.ac.abort(reason);
  }
  kill(signal = $.killSignal) {
    if (!this.child)
      throw new Error("Trying to kill a process without creating one.");
    if (!this.child.pid) throw new Error("The process pid is undefined.");
    return $.kill(this.child.pid, signal);
  }
  /**
   *  @deprecated Use $({halt: true})`cmd` instead.
   */
  halt() {
    return this;
  }
  // Getters
  get id() {
    return this._id;
  }
  get pid() {
    var _a;
    return (_a = this.child) == null ? void 0 : _a.pid;
  }
  get cmd() {
    return this._command;
  }
  get fullCmd() {
    return this._snapshot.prefix + this.cmd + this._snapshot.postfix;
  }
  get child() {
    var _a;
    return (_a = this._zurk) == null ? void 0 : _a.child;
  }
  get stdin() {
    var _a;
    return (_a = this.child) == null ? void 0 : _a.stdin;
  }
  get stdout() {
    var _a;
    return (_a = this.child) == null ? void 0 : _a.stdout;
  }
  get stderr() {
    var _a;
    return (_a = this.child) == null ? void 0 : _a.stderr;
  }
  get exitCode() {
    return this.then(
      (o) => o.exitCode,
      (o) => o.exitCode
    );
  }
  get signal() {
    var _a;
    return this._snapshot.signal || ((_a = this._snapshot.ac) == null ? void 0 : _a.signal);
  }
  get output() {
    return this._output;
  }
  get stage() {
    return this._stage;
  }
  get [Symbol.toStringTag]() {
    return "ProcessPromise";
  }
  [Symbol.toPrimitive]() {
    return this.toString();
  }
  // Configurators
  stdio(stdin, stdout = "pipe", stderr = "pipe") {
    this._stdio = [stdin, stdout, stderr];
    return this;
  }
  nothrow(v = true) {
    this._nothrow = v;
    return this;
  }
  quiet(v = true) {
    this._quiet = v;
    return this;
  }
  verbose(v = true) {
    this._verbose = v;
    return this;
  }
  timeout(d, signal = this._timeoutSignal || $.timeoutSignal) {
    if (this.isSettled()) return this;
    this._timeout = (0, import_util.parseDuration)(d);
    this._timeoutSignal = signal;
    if (this._timeoutId) clearTimeout(this._timeoutId);
    if (this._timeout && this.isRunning()) {
      this._timeoutId = setTimeout(
        () => this.kill(this._timeoutSignal),
        this._timeout
      );
      this.finally(() => clearTimeout(this._timeoutId)).catch(import_util.noop);
    }
    return this;
  }
  // Output formatters
  json() {
    return this.then((o) => o.json());
  }
  text(encoding) {
    return this.then((o) => o.text(encoding));
  }
  lines(delimiter) {
    return this.then((o) => o.lines(delimiter));
  }
  buffer() {
    return this.then((o) => o.buffer());
  }
  blob(type) {
    return this.then((o) => o.blob(type));
  }
  // Status checkers
  isQuiet() {
    var _a;
    return (_a = this._quiet) != null ? _a : this._snapshot.quiet;
  }
  isVerbose() {
    var _a;
    return ((_a = this._verbose) != null ? _a : this._snapshot.verbose) && !this.isQuiet();
  }
  isNothrow() {
    var _a;
    return (_a = this._nothrow) != null ? _a : this._snapshot.nothrow;
  }
  isHalted() {
    return this.stage === "halted";
  }
  isSettled() {
    return !!this.output;
  }
  isRunning() {
    return this.stage === "running";
  }
  // Promise API
  then(onfulfilled, onrejected) {
    return super.then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return super.catch(onrejected);
  }
  // Async iterator API
  [Symbol.asyncIterator]() {
    return __asyncGenerator(this, null, function* () {
      const memo = [];
      const dlmtr = this._snapshot.delimiter || $.delimiter || DLMTR;
      for (const chunk of this._zurk.store.stdout) {
        yield* __yieldStar((0, import_util.getLines)(chunk, memo, dlmtr));
      }
      try {
        for (var iter = __forAwait(this.stdout[Symbol.asyncIterator] ? this.stdout : import_vendor_core2.VoidStream.from(this.stdout)), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
          const chunk = temp.value;
          yield* __yieldStar((0, import_util.getLines)(chunk, memo, dlmtr));
        }
      } catch (temp) {
        error = [temp];
      } finally {
        try {
          more && (temp = iter.return) && (yield new __await(temp.call(iter)));
        } finally {
          if (error)
            throw error[0];
        }
      }
      if (memo[0]) yield memo[0];
      if (this.isNothrow()) return;
      if ((yield new __await(this.exitCode)) !== 0) throw this._output;
    });
  }
  emit(event, ...args) {
    return this;
  }
  on(event, cb) {
    this._stdin.on(event, cb);
    return this;
  }
  once(event, cb) {
    this._stdin.once(event, cb);
    return this;
  }
  write(data, encoding, cb) {
    this._stdin.write(data, encoding, cb);
    return this;
  }
  end(chunk, cb) {
    this._stdin.end(chunk, cb);
    return this;
  }
  removeListener(event, cb) {
    this._stdin.removeListener(event, cb);
    return this;
  }
  // prettier-ignore
  static disarm(p, toggle = true) {
    Object.getOwnPropertyNames(_ProcessPromise.prototype).forEach((k) => {
      if (k in Promise.prototype) return;
      if (!toggle) {
        Reflect.deleteProperty(p, k);
        return;
      }
      Object.defineProperty(p, k, { configurable: true, get() {
        throw new Error("Inappropriate usage. Apply $ instead of direct instantiation.");
      } });
    });
  }
};
Object.defineProperty(_ProcessPromise.prototype, "pipe", { get() {
  const self = this;
  const getPipeMethod = (kind) => function(dest, ...args) {
    return self._pipe.call(self, kind, dest, ...args);
  };
  const stdout = getPipeMethod("stdout");
  const stderr = getPipeMethod("stderr");
  const stdall = getPipeMethod("stdall");
  return Object.assign(stdout, { stderr, stdout, stdall });
} });
var ProcessPromise = _ProcessPromise;
var _ProcessOutput = class _ProcessOutput extends Error {
  // prettier-ignore
  constructor(code, signal = null, stdout = "", stderr = "", stdall = "", message = "", duration = 0, error = null, from = "", store = { stdout: [stdout], stderr: [stderr], stdall: [stdall] }) {
    super(message);
    const dto = code !== null && typeof code === "object" ? code : { code, signal, duration, error, from, store };
    Object.defineProperties(this, {
      _dto: { value: dto, enumerable: false },
      cause: { value: dto.error, enumerable: false },
      stdout: { get: (0, import_util.once)(() => (0, import_util.bufArrJoin)(dto.store.stdout)) },
      stderr: { get: (0, import_util.once)(() => (0, import_util.bufArrJoin)(dto.store.stderr)) },
      stdall: { get: (0, import_util.once)(() => (0, import_util.bufArrJoin)(dto.store.stdall)) },
      message: {
        get: (0, import_util.once)(
          () => message || dto.error ? _ProcessOutput.getErrorMessage(dto.error || new Error(message), dto.from) : _ProcessOutput.getExitMessage(
            dto.code,
            dto.signal,
            this.stderr,
            dto.from,
            this.stderr.trim() ? "" : _ProcessOutput.getErrorDetails(this.lines())
          )
        )
      }
    });
  }
  get exitCode() {
    return this._dto.code;
  }
  get signal() {
    return this._dto.signal;
  }
  get duration() {
    return this._dto.duration;
  }
  get [Symbol.toStringTag]() {
    return "ProcessOutput";
  }
  get ok() {
    return !this._dto.error && this.exitCode === 0;
  }
  [Symbol.toPrimitive]() {
    return this.valueOf();
  }
  toString() {
    return this.stdall;
  }
  json() {
    return JSON.parse(this.stdall);
  }
  buffer() {
    return import_node_buffer.Buffer.from(this.stdall);
  }
  blob(type = "text/plain") {
    if (!globalThis.Blob)
      throw new Error(
        "Blob is not supported in this environment. Provide a polyfill"
      );
    return new Blob([this.buffer()], { type });
  }
  text(encoding = "utf8") {
    return encoding === "utf8" ? this.toString() : this.buffer().toString(encoding);
  }
  lines(delimiter) {
    delimiters.push(delimiter);
    return [...this];
  }
  valueOf() {
    return this.stdall.trim();
  }
  *[Symbol.iterator]() {
    const memo = [];
    const dlmtr = delimiters.pop() || this._dto.delimiter || $.delimiter || DLMTR;
    for (const chunk of this._dto.store.stdall) {
      yield* __yieldStar((0, import_util.getLines)(chunk, memo, dlmtr));
    }
    if (memo[0]) yield memo[0];
  }
  [import_node_util2.inspect.custom]() {
    const codeInfo = _ProcessOutput.getExitCodeInfo(this.exitCode);
    return `ProcessOutput {
  stdout: ${import_vendor_core2.chalk.green((0, import_node_util2.inspect)(this.stdout))},
  stderr: ${import_vendor_core2.chalk.red((0, import_node_util2.inspect)(this.stderr))},
  signal: ${(0, import_node_util2.inspect)(this.signal)},
  exitCode: ${(this.ok ? import_vendor_core2.chalk.green : import_vendor_core2.chalk.red)(this.exitCode)}${codeInfo ? import_vendor_core2.chalk.grey(" (" + codeInfo + ")") : ""},
  duration: ${this.duration}
}`;
  }
};
_ProcessOutput.getExitMessage = formatExitMessage;
_ProcessOutput.getErrorMessage = formatErrorMessage;
_ProcessOutput.getErrorDetails = formatErrorDetails;
_ProcessOutput.getExitCodeInfo = getExitCodeInfo;
var ProcessOutput = _ProcessOutput;
function usePowerShell() {
  $.shell = import_vendor_core2.which.sync("powershell.exe");
  $.prefix = "";
  $.postfix = "; exit $LastExitCode";
  $.quote = import_util.quotePowerShell;
}
function usePwsh() {
  $.shell = import_vendor_core2.which.sync("pwsh");
  $.prefix = "";
  $.postfix = "; exit $LastExitCode";
  $.quote = import_util.quotePowerShell;
}
function useBash() {
  $.shell = import_vendor_core2.which.sync("bash");
  $.prefix = "set -euo pipefail;";
  $.postfix = "";
  $.quote = import_util.quote;
}
try {
  const { shell } = $;
  useBash();
  if ((0, import_util.isString)(shell)) $.shell = shell;
} catch (err) {
}
function checkShell() {
  if (!$.shell)
    throw new Error(`No shell is available: https://google.github.io/zx/shell`);
}
function checkQuote() {
  if (!$.quote)
    throw new Error(
      "No quote function is defined: https://google.github.io/zx/quotes"
    );
}
var cwdSyncHook;
function syncProcessCwd(flag = true) {
  cwdSyncHook = cwdSyncHook || (0, import_node_async_hooks.createHook)({
    init: syncCwd,
    before: syncCwd,
    promiseResolve: syncCwd,
    after: syncCwd,
    destroy: syncCwd
  });
  if (flag) cwdSyncHook.enable();
  else cwdSyncHook.disable();
}
function syncCwd() {
  if ($[CWD] != import_node_process2.default.cwd()) import_node_process2.default.chdir($[CWD]);
}
function cd(dir) {
  if (dir instanceof ProcessOutput) {
    dir = dir.toString().trim();
  }
  $.log({ kind: "cd", dir, verbose: !$.quiet && $.verbose });
  import_node_process2.default.chdir(dir);
  $[CWD] = import_node_process2.default.cwd();
}
function kill(_0) {
  return __async(this, arguments, function* (pid, signal = $.killSignal) {
    const children = yield import_vendor_core2.ps.tree({ pid, recursive: true });
    for (const p of children) {
      try {
        import_node_process2.default.kill(+p.pid, signal);
      } catch (e) {
      }
    }
    try {
      import_node_process2.default.kill(-pid, signal);
    } catch (e) {
      try {
        import_node_process2.default.kill(+pid, signal);
      } catch (e2) {
      }
    }
  });
}
var promisifyStream = (stream, from) => (0, import_util.proxyOverride)(stream, {
  then(res = import_util.noop, rej = import_util.noop) {
    return new Promise(
      (_res, _rej) => stream.once("error", (e) => _rej(rej(e))).once(
        "finish",
        () => _res(res((0, import_util.proxyOverride)(stream, from._output)))
      ).once(
        "end-piped-from",
        () => _res(res((0, import_util.proxyOverride)(stream, from._output)))
      )
    );
  },
  run() {
    return from.run();
  },
  _pipedFrom: from,
  pipe(...args) {
    const piped = stream.pipe.apply(stream, args);
    return piped instanceof ProcessPromise ? piped : promisifyStream(piped, from);
  }
});
function resolveDefaults(defs = defaults, prefix = ENV_PREFIX, env = import_node_process2.default.env, allowed = ENV_OPTS) {
  return Object.entries(env).reduce((m, [k, v]) => {
    if (v && k.startsWith(prefix)) {
      const _k = (0, import_util.toCamelCase)(k.slice(prefix.length));
      const _v = (0, import_util.parseBool)(v);
      if (allowed.has(_k)) m[_k] = _v;
    }
    return m;
  }, defs);
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  $,
  ProcessOutput,
  ProcessPromise,
  cd,
  chalk,
  defaults,
  kill,
  log,
  os,
  path,
  ps,
  quote,
  quotePowerShell,
  resolveDefaults,
  syncProcessCwd,
  useBash,
  usePowerShell,
  usePwsh,
  which,
  within
});