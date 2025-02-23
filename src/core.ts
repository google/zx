// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  type ChildProcess,
  type IOType,
  type StdioOptions,
  spawn,
  spawnSync,
} from 'node:child_process'
import { type Encoding } from 'node:crypto'
import { type AsyncHook, AsyncLocalStorage, createHook } from 'node:async_hooks'
import { type Readable, type Writable } from 'node:stream'
import fs from 'node:fs'
import { inspect } from 'node:util'
import { EOL as _EOL } from 'node:os'
import { EventEmitter } from 'node:events'
import {
  formatErrorMessage,
  formatExitMessage,
  getCallerLocation,
  getExitCodeInfo,
} from './error.js'
import {
  exec,
  buildCmd,
  chalk,
  which,
  ps,
  VoidStream,
  type ChalkInstance,
  type TSpawnStore,
} from './vendor-core.js'
import {
  type Duration,
  log,
  isString,
  isStringLiteral,
  getLast,
  getLines,
  noop,
  once,
  parseBool,
  parseDuration,
  preferLocalBin,
  proxyOverride,
  quote,
  quotePowerShell,
  toCamelCase,
  randomId,
  bufArrJoin,
} from './util.js'

export { log, type LogEntry } from './util.js'

const CWD = Symbol('processCwd')
const SYNC = Symbol('syncExec')
const EOL = Buffer.from(_EOL)
const BR_CC = '\n'.charCodeAt(0)
const SIGTERM = 'SIGTERM'
const ENV_PREFIX = 'ZX_'
const storage = new AsyncLocalStorage<Options>()

function getStore() {
  return storage.getStore() || defaults
}

export function within<R>(callback: () => R): R {
  return storage.run({ ...getStore() }, callback)
}
// prettier-ignore
export interface Options {
  [CWD]:          string
  [SYNC]:         boolean
  cwd?:           string
  ac?:            AbortController
  signal?:        AbortSignal
  input?:         string | Buffer | Readable | ProcessOutput | ProcessPromise
  timeout?:       Duration
  timeoutSignal?: NodeJS.Signals
  stdio:          StdioOptions
  verbose:        boolean
  sync:           boolean
  env:            NodeJS.ProcessEnv
  shell:          string | true
  nothrow:        boolean
  prefix:         string
  postfix:        string
  quote?:         typeof quote
  quiet:          boolean
  detached:       boolean
  preferLocal:    boolean | string | string[]
  spawn:          typeof spawn
  spawnSync:      typeof spawnSync
  store?:         TSpawnStore
  log:            typeof log
  kill:           typeof kill
  killSignal?:    NodeJS.Signals
  halt?:          boolean
}

// prettier-ignore
export const defaults: Options = resolveDefaults({
  [CWD]:          process.cwd(),
  [SYNC]:         false,
  verbose:        false,
  env:            process.env,
  sync:           false,
  shell:          true,
  stdio:          'pipe',
  nothrow:        false,
  quiet:          false,
  prefix:         '',
  postfix:        '',
  detached:       false,
  preferLocal:    false,
  spawn,
  spawnSync,
  log,
  kill,
  killSignal:     SIGTERM,
  timeoutSignal:  SIGTERM,
})

// prettier-ignore
export interface Shell<
  S = false,
  R = S extends true ? ProcessOutput : ProcessPromise,
> {
  (pieces: TemplateStringsArray, ...args: any[]): R
  <O extends Partial<Options> = Partial<Options>, R = O extends { sync: true } ? Shell<true> : Shell>(opts: O): R
  sync: {
    (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput
    (opts: Partial<Omit<Options, 'sync'>>): Shell<true>
  }
}
const bound: [string, string, Options][] = []

export const $: Shell & Options = new Proxy<Shell & Options>(
  function (pieces: TemplateStringsArray | Partial<Options>, ...args: any) {
    const snapshot = getStore()
    if (!Array.isArray(pieces)) {
      return function (this: any, ...args: any) {
        const self = this
        return within(() =>
          Object.assign($, snapshot, pieces).apply(self, args)
        )
      }
    }
    const from = getCallerLocation()
    if (pieces.some((p) => p == undefined))
      throw new Error(`Malformed command at ${from}`)

    checkShell()
    checkQuote()

    const cmd = buildCmd(
      $.quote as typeof quote,
      pieces as TemplateStringsArray,
      args
    ) as string
    const sync = snapshot[SYNC]
    bound.push([cmd, from, snapshot])
    const process = new ProcessPromise(noop)

    if (!process.isHalted() || sync) process.run()

    return sync ? process.output : process
  } as Shell & Options,
  {
    set(_, key, value) {
      const target = key in Function.prototype ? _ : getStore()
      Reflect.set(target, key === 'sync' ? SYNC : key, value)

      return true
    },
    get(_, key) {
      if (key === 'sync') return $({ sync: true })

      const target = key in Function.prototype ? _ : getStore()
      return Reflect.get(target, key)
    },
  }
)

type ProcessStage = 'initial' | 'halted' | 'running' | 'fulfilled' | 'rejected'

type Resolve = (out: ProcessOutput) => void

type PipeDest = Writable | ProcessPromise | TemplateStringsArray | string
type PipeMethod = {
  (dest: TemplateStringsArray, ...args: any[]): ProcessPromise
  <D extends Writable>(dest: D): D & PromiseLike<ProcessOutput & D>
  <D extends ProcessPromise>(dest: D): D
}

export class ProcessPromise extends Promise<ProcessOutput> {
  private _stage: ProcessStage = 'initial'
  private _id = randomId()
  private _command = ''
  private _from = ''
  private _snapshot = getStore()
  private _stdio?: StdioOptions
  private _nothrow?: boolean
  private _quiet?: boolean
  private _verbose?: boolean
  private _timeout?: number
  private _timeoutSignal?: NodeJS.Signals
  private _timeoutId?: NodeJS.Timeout
  private _piped = false
  private _pipedFrom?: ProcessPromise
  private _ee = new EventEmitter()
  private _stdin = new VoidStream()
  private _zurk: ReturnType<typeof exec> | null = null
  private _output: ProcessOutput | null = null
  private _reject: Resolve = noop
  private _resolve: Resolve = noop

  constructor(executor: (resolve: Resolve, reject: Resolve) => void) {
    let resolve: Resolve
    let reject: Resolve
    super((...args) => {
      ;[resolve, reject] = args
      executor(...args)
    })

    if (bound.length) {
      const [cmd, from, snapshot] = bound.pop()!
      this._command = cmd
      this._from = from
      this._resolve = resolve!
      this._reject = (v: ProcessOutput) => {
        reject!(v)
        if (snapshot[SYNC]) throw v
      }
      this._snapshot = { ac: new AbortController(), ...snapshot }
      if (this._snapshot.halt) this._stage = 'halted'
    } else ProcessPromise.disarm(this)
  }

  run(): ProcessPromise {
    if (this.isRunning() || this.isSettled()) return this // The _run() can be called from a few places.
    this._stage = 'running'
    this._pipedFrom?.run()

    const self = this
    const $ = self._snapshot
    const id = self.id
    const sync = $[SYNC]
    const timeout = self._timeout ?? $.timeout
    const timeoutSignal = self._timeoutSignal ?? $.timeoutSignal

    if ($.preferLocal) {
      const dirs =
        $.preferLocal === true ? [$.cwd, $[CWD]] : [$.preferLocal].flat()
      $.env = preferLocalBin($.env, ...dirs)
    }

    $.log({
      kind: 'cmd',
      cmd: self.cmd,
      verbose: self.isVerbose(),
      id,
    })

    // prettier-ignore
    this._zurk = exec({
      sync,
      id,
      cmd:      self.fullCmd,
      cwd:      $.cwd ?? $[CWD],
      input:    ($.input as ProcessPromise | ProcessOutput)?.stdout ?? $.input,
      ac:       $.ac,
      signal:   $.signal,
      shell:    isString($.shell) ? $.shell : true,
      env:      $.env,
      spawn:    $.spawn,
      spawnSync:$.spawnSync,
      store:    $.store,
      stdin:    self._stdin,
      stdio:    self._stdio ?? $.stdio,
      detached: $.detached,
      ee:       self._ee,
      run: (cb) => cb(),
      on: {
        start: () => {
          !sync && timeout && self.timeout(timeout, timeoutSignal)
        },
        stdout: (data) => {
          // If process is piped, don't print output.
          if (self._piped) return
          $.log({ kind: 'stdout', data, verbose: self.isVerbose(), id })
        },
        stderr: (data) => {
          // Stderr should be printed regardless of piping.
          $.log({ kind: 'stderr', data, verbose: !self.isQuiet(), id })
        },
        end: (data, c) => {
          const { error, status, signal, duration, ctx: {store} } = data
          const { stdout, stderr } = store
          const output = self._output = new ProcessOutput({
            code: status,
            signal,
            error,
            duration,
            store,
            from: self._from,
          })

          $.log({ kind: 'end', signal, exitCode: status, duration, error, verbose: self.isVerbose(), id })

          // Ensures EOL
          if (stdout.length && getLast(getLast(stdout)) !== BR_CC) c.on.stdout!(EOL, c)
          if (stderr.length && getLast(getLast(stderr)) !== BR_CC) c.on.stderr!(EOL, c)

          if (!output.ok && !self.isNothrow()) {
            self._stage = 'rejected'
            self._reject(output)
          } else {
            self._stage = 'fulfilled'
            self._resolve(output)
          }
        },
      },
    })

    return this
  }

  // Essentials
  pipe!: PipeMethod & {
    [key in keyof TSpawnStore]: PipeMethod
  }
  // prettier-ignore
  static {
    Object.defineProperty(this.prototype, 'pipe', { get() {
      const self = this
      const getPipeMethod = (kind: keyof TSpawnStore): PipeMethod => function (dest: PipeDest, ...args: any[]) { return self._pipe.call(self, kind, dest, ...args) }
      const stdout = getPipeMethod('stdout')
      const stderr = getPipeMethod('stderr')
      const stdall = getPipeMethod('stdall')
      return Object.assign(stdout, { stderr, stdout, stdall })
    }})
  }
  private _pipe(
    source: keyof TSpawnStore,
    dest: PipeDest,
    ...args: any[]
  ): (Writable & PromiseLike<ProcessPromise & Writable>) | ProcessPromise {
    if (isStringLiteral(dest, ...args))
      return this.pipe[source](
        $({
          halt: true,
          ac: this._snapshot.ac,
          signal: this._snapshot.signal,
        })(dest as TemplateStringsArray, ...args)
      )

    this._piped = true
    const ee = this._ee
    const from = new VoidStream()
    const fill = () => {
      for (const chunk of this._zurk!.store[source]) from.write(chunk)
      return true
    }
    const fillEnd = () => this.isSettled() && fill() && from.end()

    if (!this.isSettled()) {
      const onData = (chunk: string | Buffer) => from.write(chunk)
      ee.once(source, () => {
        fill()
        ee.on(source, onData)
      }).once('end', () => {
        ee.removeListener(source, onData)
        from.end()
      })
    }

    if (isString(dest)) dest = fs.createWriteStream(dest)

    if (dest instanceof ProcessPromise) {
      dest._pipedFrom = this

      if (dest.isHalted() && this.isHalted()) {
        ee.once('start', () => from.pipe(dest.run()._stdin))
      } else {
        this.catch((e) => (dest.isNothrow() ? noop : dest._reject(e)))
        from.pipe(dest.run()._stdin)
      }
      fillEnd()
      return dest
    }

    from.once('end', () => dest.emit('end-piped-from')).pipe(dest)
    fillEnd()
    return promisifyStream(dest, this) as Writable &
      PromiseLike<ProcessPromise & Writable>
  }

  abort(reason?: string) {
    if (this.signal !== this._snapshot.ac?.signal)
      throw new Error('The signal is controlled by another process.')

    if (!this.child)
      throw new Error('Trying to abort a process without creating one.')

    this._zurk?.ac.abort(reason)
  }

  kill(signal = $.killSignal): Promise<void> {
    if (!this.child)
      throw new Error('Trying to kill a process without creating one.')
    if (!this.child.pid) throw new Error('The process pid is undefined.')

    return $.kill(this.child.pid, signal)
  }

  /**
   *  @deprecated Use $({halt: true})`cmd` instead.
   */
  halt(): this {
    return this
  }

  // Getters
  get id(): string {
    return this._id
  }

  get pid(): number | undefined {
    return this.child?.pid
  }

  get cmd(): string {
    return this._command
  }

  get fullCmd(): string {
    return this._snapshot.prefix + this.cmd + this._snapshot.postfix
  }

  get child(): ChildProcess | undefined {
    return this._zurk?.child
  }

  get stdin(): Writable {
    return this.child?.stdin!
  }

  get stdout(): Readable {
    return this.child?.stdout!
  }

  get stderr(): Readable {
    return this.child?.stderr!
  }

  get exitCode(): Promise<number | null> {
    return this.then(
      (p) => p.exitCode,
      (p) => p.exitCode
    )
  }

  get signal(): AbortSignal | undefined {
    return this._snapshot.signal || this._snapshot.ac?.signal
  }

  get output(): ProcessOutput | null {
    return this._output
  }

  get stage(): ProcessStage {
    return this._stage
  }

  get [Symbol.toStringTag](): string {
    return 'ProcessPromise'
  }

  [Symbol.toPrimitive](): string {
    return this.toString()
  }

  // Configurators
  stdio(
    stdin: IOType,
    stdout: IOType = 'pipe',
    stderr: IOType = 'pipe'
  ): ProcessPromise {
    this._stdio = [stdin, stdout, stderr]
    return this
  }

  nothrow(v = true): ProcessPromise {
    this._nothrow = v
    return this
  }

  quiet(v = true): ProcessPromise {
    this._quiet = v
    return this
  }

  verbose(v = true): ProcessPromise {
    this._verbose = v
    return this
  }

  timeout(
    d: Duration,
    signal = this._timeoutSignal || $.timeoutSignal
  ): ProcessPromise {
    if (this.isSettled()) return this

    this._timeout = parseDuration(d)
    this._timeoutSignal = signal

    if (this._timeoutId) clearTimeout(this._timeoutId)
    if (this._timeout && this.isRunning()) {
      this._timeoutId = setTimeout(
        () => this.kill(this._timeoutSignal),
        this._timeout
      )
      this.finally(() => clearTimeout(this._timeoutId)).catch(noop)
    }
    return this
  }

  // Output formatters
  json<T = any>(): Promise<T> {
    return this.then((p) => p.json<T>())
  }

  text(encoding?: Encoding): Promise<string> {
    return this.then((p) => p.text(encoding))
  }

  lines(): Promise<string[]> {
    return this.then((p) => p.lines())
  }

  buffer(): Promise<Buffer> {
    return this.then((p) => p.buffer())
  }

  blob(type?: string): Promise<Blob> {
    return this.then((p) => p.blob(type))
  }

  // Status checkers
  isQuiet(): boolean {
    return this._quiet ?? this._snapshot.quiet
  }

  isVerbose(): boolean {
    return (this._verbose ?? this._snapshot.verbose) && !this.isQuiet()
  }

  isNothrow(): boolean {
    return this._nothrow ?? this._snapshot.nothrow
  }

  isHalted(): boolean {
    return this.stage === 'halted'
  }

  private isSettled(): boolean {
    return !!this.output
  }

  private isRunning(): boolean {
    return this.stage === 'running'
  }

  // Promise API
  then<R = ProcessOutput, E = ProcessOutput>(
    onfulfilled?:
      | ((value: ProcessOutput) => PromiseLike<R> | R)
      | undefined
      | null,
    onrejected?:
      | ((reason: ProcessOutput) => PromiseLike<E> | E)
      | undefined
      | null
  ): Promise<R | E> {
    return super.then(onfulfilled, onrejected)
  }

  catch<T = ProcessOutput>(
    onrejected?:
      | ((reason: ProcessOutput) => PromiseLike<T> | T)
      | undefined
      | null
  ): Promise<ProcessOutput | T> {
    return super.catch(onrejected)
  }

  // Async iterator API
  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    const memo: (string | undefined)[] = []

    for (const chunk of this._zurk!.store.stdout) {
      yield* getLines(chunk, memo)
    }

    for await (const chunk of this.stdout[Symbol.asyncIterator]
      ? this.stdout
      : VoidStream.from(this.stdout)) {
      yield* getLines(chunk, memo)
    }

    if (memo[0]) yield memo[0]

    if ((await this.exitCode) !== 0) throw this._output
  }

  // Stream-like API
  private writable = true
  private emit(event: string, ...args: any[]) {
    return this
  }
  private on(event: string, cb: any) {
    this._stdin.on(event, cb)
    return this
  }
  private once(event: string, cb: any) {
    this._stdin.once(event, cb)
    return this
  }
  private write(data: any, encoding: BufferEncoding, cb: any) {
    this._stdin.write(data, encoding, cb)
    return this
  }
  private end(chunk: any, cb: any) {
    this._stdin.end(chunk, cb)
    return this
  }
  private removeListener(event: string, cb: any) {
    this._stdin.removeListener(event, cb)
    return this
  }

  // prettier-ignore
  private static disarm(p: ProcessPromise, toggle = true): void {
    Object.getOwnPropertyNames(ProcessPromise.prototype).forEach(k => {
      if (k in Promise.prototype) return
      if (!toggle) { Reflect.deleteProperty(p, k); return }
      Object.defineProperty(p, k, { configurable: true, get() {
        throw new Error('Inappropriate usage. Apply $ instead of direct instantiation.')
      }})
    })
  }
}

type ProcessDto = {
  code: number | null
  signal: NodeJS.Signals | null
  duration: number
  error: any
  from: string
  store: TSpawnStore
}

export class ProcessOutput extends Error {
  private readonly _dto: ProcessDto
  constructor(dto: ProcessDto)
  constructor(
    code: number | null,
    signal: NodeJS.Signals | null,
    stdout: string,
    stderr: string,
    stdall: string,
    message: string,
    duration?: number
  )
  // prettier-ignore
  constructor(
    code: number | null | ProcessDto,
    signal: NodeJS.Signals | null = null,
    stdout: string = '',
    stderr: string = '',
    stdall: string = '',
    message: string = '',
    duration: number = 0,
    error: any = null,
    from: string = '',
    store: TSpawnStore = { stdout: [stdout], stderr: [stderr], stdall: [stdall], }
  ) {
    super(message)
    const dto = this._dto = code !== null && typeof code === 'object'
      ? code
      : { code, signal, duration, error, from, store }

    Object.defineProperties(this, {
      stdout: { get: once(() => bufArrJoin(dto.store.stdout)) },
      stderr: { get: once(() => bufArrJoin(dto.store.stderr)) },
      stdall: { get: once(() => bufArrJoin(dto.store.stdall)) },
      message: { get: once(() =>
          message || dto.error
            ? ProcessOutput.getErrorMessage(dto.error, dto.from)
            : ProcessOutput.getExitMessage(dto.code, dto.signal, this.stderr, dto.from)
        ),
      },
    })
  }
  message!: string
  stdout!: string
  stderr!: string
  stdall!: string

  get exitCode(): number | null {
    return this._dto.code
  }

  get signal(): NodeJS.Signals | null {
    return this._dto.signal
  }

  get duration(): number {
    return this._dto.duration
  }

  get [Symbol.toStringTag](): string {
    return 'ProcessOutput'
  }

  get ok(): boolean {
    return !this._dto.error && this.exitCode === 0
  }

  [Symbol.toPrimitive](): string {
    return this.valueOf()
  }

  toString(): string {
    return this.stdall
  }

  json<T = any>(): T {
    return JSON.parse(this.stdall)
  }

  buffer(): Buffer {
    return Buffer.from(this.stdall)
  }

  blob(type = 'text/plain'): Blob {
    if (!globalThis.Blob)
      throw new Error(
        'Blob is not supported in this environment. Provide a polyfill'
      )
    return new Blob([this.buffer()], { type })
  }

  text(encoding: Encoding = 'utf8'): string {
    return encoding === 'utf8'
      ? this.toString()
      : this.buffer().toString(encoding)
  }

  lines(): string[] {
    return [...this]
  }

  valueOf(): string {
    return this.stdall.trim()
  }

  *[Symbol.iterator](): Iterator<string> {
    const memo: (string | undefined)[] = []

    for (const chunk of this._dto.store.stdall) {
      yield* getLines(chunk, memo)
    }

    if (memo[0]) yield memo[0]
  }

  static getExitMessage = formatExitMessage

  static getErrorMessage = formatErrorMessage;

  [inspect.custom](): string {
    let stringify = (s: string, c: ChalkInstance) =>
      s.length === 0 ? "''" : c(inspect(s))
    return `ProcessOutput {
  stdout: ${stringify(this.stdout, chalk.green)},
  stderr: ${stringify(this.stderr, chalk.red)},
  signal: ${inspect(this.signal)},
  exitCode: ${(this.exitCode === 0 ? chalk.green : chalk.red)(this.exitCode)}${
    getExitCodeInfo(this.exitCode)
      ? chalk.grey(' (' + getExitCodeInfo(this.exitCode) + ')')
      : ''
  },
  duration: ${this.duration}
}`
  }
}

export function usePowerShell() {
  $.shell = which.sync('powershell.exe')
  $.prefix = ''
  $.postfix = '; exit $LastExitCode'
  $.quote = quotePowerShell
}

export function usePwsh() {
  $.shell = which.sync('pwsh')
  $.prefix = ''
  $.postfix = '; exit $LastExitCode'
  $.quote = quotePowerShell
}

export function useBash() {
  $.shell = which.sync('bash')
  $.prefix = 'set -euo pipefail;'
  $.postfix = ''
  $.quote = quote
}

try {
  useBash()
} catch (err) {}

function checkShell() {
  if (!$.shell)
    throw new Error(`No shell is available: https://ï.at/zx-no-shell`)
}

function checkQuote() {
  if (!$.quote)
    throw new Error('No quote function is defined: https://ï.at/no-quote-func')
}

let cwdSyncHook: AsyncHook

export function syncProcessCwd(flag: boolean = true) {
  cwdSyncHook =
    cwdSyncHook ||
    createHook({
      init: syncCwd,
      before: syncCwd,
      promiseResolve: syncCwd,
      after: syncCwd,
      destroy: syncCwd,
    })
  if (flag) cwdSyncHook.enable()
  else cwdSyncHook.disable()
}

function syncCwd() {
  if ($[CWD] != process.cwd()) process.chdir($[CWD])
}

export function cd(dir: string | ProcessOutput) {
  if (dir instanceof ProcessOutput) {
    dir = dir.toString().trim()
  }

  $.log({ kind: 'cd', dir, verbose: !$.quiet && $.verbose })
  process.chdir(dir)
  $[CWD] = process.cwd()
}

export async function kill(pid: number, signal = $.killSignal) {
  const children = await ps.tree({ pid, recursive: true })
  for (const p of children) {
    try {
      process.kill(+p.pid, signal)
    } catch (e) {}
  }
  try {
    process.kill(-pid, signal)
  } catch (e) {
    try {
      process.kill(+pid, signal)
    } catch (e) {}
  }
}

const promisifyStream = <S extends Writable>(
  stream: S,
  from: ProcessPromise
): S & PromiseLike<ProcessOutput & S> =>
  proxyOverride(stream as S & PromiseLike<ProcessOutput & S>, {
    then(res: any = noop, rej: any = noop) {
      return new Promise((_res, _rej) =>
        stream
          .once('error', (e) => _rej(rej(e)))
          .once('finish', () =>
            _res(res(proxyOverride(stream, (from as any)._output)))
          )
          .once('end-piped-from', () =>
            _res(res(proxyOverride(stream, (from as any)._output)))
          )
      )
    },
    run() {
      return from.run()
    },
    _pipedFrom: from,
    pipe(...args: any) {
      const piped = stream.pipe.apply(stream, args)
      return piped instanceof ProcessPromise
        ? piped
        : promisifyStream(piped as Writable, from)
    },
  })

export function resolveDefaults(
  defs: Options = defaults,
  prefix: string = ENV_PREFIX,
  env = process.env
): Options {
  const allowed = new Set([
    'cwd',
    'preferLocal',
    'detached',
    'verbose',
    'quiet',
    'timeout',
    'timeoutSignal',
    'killSignal',
    'prefix',
    'postfix',
    'shell',
  ])

  return Object.entries(env).reduce<Options>((m, [k, v]) => {
    if (v && k.startsWith(prefix)) {
      const _k = toCamelCase(k.slice(prefix.length))
      const _v = parseBool(v)
      if (allowed.has(_k)) (m as any)[_k] = _v
    }
    return m
  }, defs)
}
