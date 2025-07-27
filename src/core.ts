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

import { type AsyncHook, AsyncLocalStorage, createHook } from 'node:async_hooks'
import { Buffer } from 'node:buffer'
import cp, {
  type ChildProcess,
  type IOType,
  type StdioOptions,
} from 'node:child_process'
import { type Encoding } from 'node:crypto'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import { EOL as _EOL } from 'node:os'
import process from 'node:process'
import { type Readable, type Writable } from 'node:stream'
import { inspect } from 'node:util'

import { Fail } from './error.ts'
import { log } from './log.ts'
import {
  exec,
  buildCmd,
  chalk,
  which,
  ps,
  VoidStream,
  type TSpawnStore,
  type TSpawnResult,
} from './vendor-core.ts'
import {
  type Duration,
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
} from './util.ts'

export { default as path } from 'node:path'
export * as os from 'node:os'
export { Fail } from './error.ts'
export { log, type LogEntry } from './log.ts'
export { chalk, which, ps } from './vendor-core.ts'
export { type Duration, quote, quotePowerShell } from './util.ts'

const CWD = Symbol('processCwd')
const SYNC = Symbol('syncExec')
const EPF = Symbol('end-piped-from')
const EOL = Buffer.from(_EOL)
const BR_CC = '\n'.charCodeAt(0)
const DLMTR = /\r?\n/
const SIGTERM = 'SIGTERM'
const ENV_PREFIX = 'ZX_'
const ENV_OPTS: Set<string> = new Set([
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
  prefix?:        string
  postfix?:       string
  quote?:         typeof quote
  quiet:          boolean
  detached:       boolean
  preferLocal:    boolean | string | string[]
  spawn:          typeof cp.spawn
  spawnSync:      typeof cp.spawnSync
  store?:         TSpawnStore
  log:            typeof log
  kill:           typeof kill
  killSignal?:    NodeJS.Signals
  halt?:          boolean
  delimiter?:     string | RegExp
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
  detached:       false,
  preferLocal:    false,
  spawn:          cp.spawn,
  spawnSync:      cp.spawnSync,
  log,
  kill,
  killSignal:     SIGTERM,
  timeoutSignal:  SIGTERM,
})

type Snapshot = Options & {
  from: string
  cmd: string
  ee: EventEmitter
  ac: AbortController
}

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

// Internal storages
const storage = new AsyncLocalStorage<Options>()
type BoxItem = Snapshot | Options['delimiter']
const box = Object.assign([] as BoxItem[], {
  loot<T extends BoxItem, R = T | undefined>(): R {
    if (box.length > 1) throw new Fail(`Broken box: ${box.join()}`)
    return box.pop() as R
  },
})

const getStore = () => storage.getStore() || defaults

const getSnapshot = (opts: Options, from: string, cmd: string): Snapshot => ({
  ...opts,
  ac: opts.ac || new AbortController(),
  ee: new EventEmitter(),
  from,
  cmd,
})

export function within<R>(callback: () => R): R {
  return storage.run({ ...getStore() }, callback)
}

// The zx
export type $ = Shell & Options

export const $: $ = new Proxy<$>(
  function (pieces: TemplateStringsArray | Partial<Options>, ...args: any[]) {
    const opts = getStore()
    if (!Array.isArray(pieces)) {
      return function (this: any, ...args: any) {
        return within(() => Object.assign($, opts, pieces).apply(this, args))
      }
    }
    const from = Fail.getCallerLocation()
    if (pieces.some((p) => p == null))
      throw new Fail(`Malformed command at ${from}`)

    checkShell()
    checkQuote()

    const cmd = buildCmd(
      $.quote as typeof quote,
      pieces as TemplateStringsArray,
      args
    ) as string
    box.push(getSnapshot(opts, from, cmd))
    const pp = new ProcessPromise(noop)

    if (!pp.isHalted()) pp.run()

    return pp.sync ? pp.output : pp
  } as $,
  {
    set(t, key, value) {
      return Reflect.set(
        key in Function.prototype ? t : getStore(),
        key === 'sync' ? SYNC : key,
        value
      )
    },
    get(t, key) {
      return key === 'sync'
        ? $({ sync: true })
        : Reflect.get(key in Function.prototype ? t : getStore(), key)
    },
  }
)

type ProcessStage = 'initial' | 'halted' | 'running' | 'fulfilled' | 'rejected'

type Resolve = (out: ProcessOutput) => void

type PromisifiedStream<D extends Writable> = D & PromiseLike<ProcessOutput & D>

type PipeDest = Writable | ProcessPromise | TemplateStringsArray | string
type PipeMethod = {
  (dest: TemplateStringsArray, ...args: any[]): ProcessPromise
  (file: string): PromisifiedStream<Writable>
  <D extends Writable>(dest: D): PromisifiedStream<D>
  <D extends ProcessPromise>(dest: D): D
}

export class ProcessPromise extends Promise<ProcessOutput> {
  private _stage: ProcessStage = 'initial'
  private _id = randomId()
  private _snapshot!: Snapshot
  private _timeoutId?: ReturnType<typeof setTimeout>
  private _piped = false
  private _pipedFrom?: ProcessPromise
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

    const snapshot = box.loot<Snapshot>()
    if (snapshot) {
      this._snapshot = snapshot
      this._resolve = resolve!
      this._reject = (v: ProcessOutput) => {
        reject!(v)
        if (this.sync) throw v
      }
      if (snapshot.halt) this._stage = 'halted'
    } else ProcessPromise.disarm(this)
  }

  run(): ProcessPromise {
    if (this.isRunning() || this.isSettled()) return this // The _run() can be called from a few places.
    this._stage = 'running'
    this._pipedFrom?.run()

    const self = this
    const $ = self._snapshot
    const id = self.id
    const cwd = $.cwd ?? $[CWD]

    if ($.preferLocal) {
      const dirs =
        $.preferLocal === true ? [$.cwd, $[CWD]] : [$.preferLocal].flat()
      $.env = preferLocalBin($.env, ...dirs)
    }

    // prettier-ignore
    this._zurk = exec({
      cmd:      self.fullCmd,
      cwd,
      input:    ($.input as ProcessPromise | ProcessOutput)?.stdout ?? $.input,
      stdin:    self._stdin,
      sync:     self.sync,
      signal:   self.signal,
      shell:    isString($.shell) ? $.shell : true,
      id,
      env:      $.env,
      spawn:    $.spawn,
      spawnSync:$.spawnSync,
      store:    $.store,
      stdio:    $.stdio,
      detached: $.detached,
      ee:       $.ee,
      run(cb, ctx){
        (self.cmd as unknown as Promise<string>).then?.(
          cmd => {
            $.cmd = cmd
            ctx.cmd = self.fullCmd
            cb()
          },
          error => ctx.on.end!({ error, status: null, signal: null, duration: 0, ctx } as TSpawnResult, ctx)
        ) || cb()
      },
      on: {
        start: () => {
          $.log({ kind: 'cmd', cmd: $.cmd, cwd, verbose: self.isVerbose(), id })
          self.timeout($.timeout, $.timeoutSignal)
        },
        stdout: (data) => {
          // If the process is piped, don't print its output.
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
            from: $.from,
          })

          $.log({ kind: 'end', signal, exitCode: status, duration, error, verbose: self.isVerbose(), id })

          // Ensures EOL
          if (stdout.length && getLast(getLast(stdout)) !== BR_CC) c.on.stdout!(EOL, c)
          if (stderr.length && getLast(getLast(stderr)) !== BR_CC) c.on.stderr!(EOL, c)

          if (output.ok || self.isNothrow()) {
            self._stage = 'fulfilled'
            self._resolve(output)
          } else {
            self._stage = 'rejected'
            self._reject(output)
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
  ): PromisifiedStream<Writable> | ProcessPromise {
    if (isStringLiteral(dest, ...args))
      return this.pipe[source](
        $({
          halt: true,
          signal: this.signal,
        })(dest as TemplateStringsArray, ...args)
      )

    this._piped = true
    const { ee } = this._snapshot
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
        this.catch((e) => !dest.isNothrow() && dest._reject(e))
        from.pipe(dest.run()._stdin)
      }
      fillEnd()
      return dest
    }

    from.once('end', () => dest.emit(EPF)).pipe(dest)
    fillEnd()
    return promisifyStream(dest, this) as Writable &
      PromiseLike<ProcessOutput & Writable>
  }

  abort(reason?: string) {
    if (this.isSettled()) throw new Fail('Too late to abort the process.')
    if (this.signal !== this.ac.signal)
      throw new Fail('The signal is controlled by another process.')
    if (!this.child)
      throw new Fail('Trying to abort a process without creating one.')

    this.ac.abort(reason)
  }

  kill(signal = $.killSignal): Promise<void> {
    if (this.isSettled()) throw new Fail('Too late to kill the process.')
    if (!this.child)
      throw new Fail('Trying to kill a process without creating one.')
    if (!this.pid) throw new Fail('The process pid is undefined.')

    return $.kill(this.pid, signal)
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
    return this._snapshot.cmd
  }

  get fullCmd(): string {
    const { prefix = '', postfix = '', cmd } = this._snapshot
    return prefix + cmd + postfix
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
      (o) => o.exitCode,
      (o) => o.exitCode
    )
  }

  get signal(): AbortSignal {
    return this._snapshot.signal || this.ac.signal
  }

  get ac(): AbortController {
    return this._snapshot.ac
  }

  get output(): ProcessOutput | null {
    return this._output
  }

  get stage(): ProcessStage {
    return this._stage
  }

  get sync(): boolean {
    return this._snapshot[SYNC]
  }

  override get [Symbol.toStringTag](): string {
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
    this._snapshot.stdio = [stdin, stdout, stderr]
    return this
  }

  nothrow(v = true): ProcessPromise {
    this._snapshot.nothrow = v
    return this
  }

  quiet(v = true): ProcessPromise {
    this._snapshot.quiet = v
    return this
  }

  verbose(v = true): ProcessPromise {
    this._snapshot.verbose = v
    return this
  }

  timeout(d: Duration = 0, signal = $.timeoutSignal): ProcessPromise {
    if (this.isSettled()) return this

    const $ = this._snapshot
    $.timeout = parseDuration(d)
    $.timeoutSignal = signal

    if (this._timeoutId) clearTimeout(this._timeoutId)
    if ($.timeout && this.isRunning()) {
      this._timeoutId = setTimeout(() => this.kill($.timeoutSignal), $.timeout)
      this.finally(() => clearTimeout(this._timeoutId)).catch(noop)
    }
    return this
  }

  // Output formatters
  json<T = any>(): Promise<T> {
    return this.then((o) => o.json<T>())
  }

  text(encoding?: Encoding): Promise<string> {
    return this.then((o) => o.text(encoding))
  }

  lines(delimiter?: Options['delimiter']): Promise<string[]> {
    return this.then((o) => o.lines(delimiter))
  }

  buffer(): Promise<Buffer> {
    return this.then((o) => o.buffer())
  }

  blob(type?: string): Promise<Blob> {
    return this.then((o) => o.blob(type))
  }

  // Status checkers
  isQuiet(): boolean {
    return this._snapshot.quiet
  }

  isVerbose(): boolean {
    return this._snapshot.verbose && !this.isQuiet()
  }

  isNothrow(): boolean {
    return this._snapshot.nothrow
  }

  isHalted(): boolean {
    return this.stage === 'halted' && !this.sync
  }

  private isSettled(): boolean {
    return !!this.output
  }

  private isRunning(): boolean {
    return this.stage === 'running'
  }

  // Promise API
  override then<R = ProcessOutput, E = ProcessOutput>(
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

  override catch<T = ProcessOutput>(
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
    const dlmtr = this._snapshot.delimiter || $.delimiter || DLMTR

    for (const chunk of this._zurk!.store.stdout) {
      yield* getLines(chunk, memo, dlmtr)
    }

    for await (const chunk of this.stdout[Symbol.asyncIterator]
      ? this.stdout
      : VoidStream.from(this.stdout)) {
      yield* getLines(chunk, memo, dlmtr)
    }

    if (memo[0]) yield memo[0]

    await this
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
  private write(data: any, encoding: NodeJS.BufferEncoding, cb: any) {
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
        throw new Fail('Inappropriate usage. Apply $ instead of direct instantiation.')
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
  delimiter?: string | RegExp
}

export class ProcessOutput extends Error {
  private readonly _dto!: ProcessDto
  cause!: Error | null
  message!: string
  stdout!: string
  stderr!: string
  stdall!: string
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
    const dto = code !== null && typeof code === 'object'
      ? code
      : { code, signal, duration, error, from, store }

    Object.defineProperties(this, {
      _dto: { value: dto, enumerable: false },
      cause: { value: dto.error, enumerable: false },
      stdout: { get: once(() => bufArrJoin(dto.store.stdout)) },
      stderr: { get: once(() => bufArrJoin(dto.store.stderr)) },
      stdall: { get: once(() => bufArrJoin(dto.store.stdall)) },
      message: { get: once(() =>
          message || dto.error
            ? ProcessOutput.getErrorMessage(dto.error || new Error(message), dto.from)
            : ProcessOutput.getExitMessage(
              dto.code,
              dto.signal,
              this.stderr,
              dto.from,
              this.stderr.trim() ? '' : ProcessOutput.getErrorDetails(this.lines())
            )
        ),
      },
    })
  }

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

  json<T = any>(): T {
    return JSON.parse(this.stdall)
  }

  buffer(): Buffer {
    return Buffer.from(this.stdall)
  }

  blob(type = 'text/plain'): Blob {
    if (!globalThis.Blob)
      throw new Fail(
        'Blob is not supported in this environment. Provide a polyfill'
      )
    return new Blob([this.buffer()], { type })
  }

  text(encoding: Encoding = 'utf8'): string {
    return encoding === 'utf8'
      ? this.toString()
      : this.buffer().toString(encoding)
  }

  lines(delimiter?: string | RegExp): string[] {
    box.push(delimiter)
    return [...this]
  }

  override toString(): string {
    return this.stdall
  }

  override valueOf(): string {
    return this.stdall.trim()
  }

  [Symbol.toPrimitive](): string {
    return this.valueOf()
  }

  *[Symbol.iterator](): Iterator<string> {
    const memo: (string | undefined)[] = []
    // prettier-ignore
    const dlmtr = box.loot<Options['delimiter']>() || this._dto.delimiter || $.delimiter || DLMTR

    for (const chunk of this._dto.store.stdall) {
      yield* getLines(chunk, memo, dlmtr)
    }

    if (memo[0]) yield memo[0]
  }

  [inspect.custom](): string {
    const codeInfo = ProcessOutput.getExitCodeInfo(this.exitCode)

    return `ProcessOutput {
  stdout: ${chalk.green(inspect(this.stdout))},
  stderr: ${chalk.red(inspect(this.stderr))},
  signal: ${inspect(this.signal)},
  exitCode: ${(this.ok ? chalk.green : chalk.red)(this.exitCode)}${
    codeInfo ? chalk.grey(' (' + codeInfo + ')') : ''
  },
  duration: ${this.duration}
}`
  }

  static getExitMessage = Fail.formatExitMessage

  static getErrorMessage = Fail.formatErrorMessage

  static getErrorDetails = Fail.formatErrorDetails

  static getExitCodeInfo = Fail.getExitCodeInfo
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
  const { shell, prefix, postfix } = $
  useBash()
  if (isString(shell)) $.shell = shell
  if (isString(prefix)) $.prefix = prefix
  if (isString(postfix)) $.postfix = postfix
} catch (err) {}

function checkShell() {
  if (!$.shell) throw new Fail(`No shell is available: ${Fail.DOCS_URL}/shell`)
}

function checkQuote() {
  if (!$.quote)
    throw new Fail(`No quote function is defined: ${Fail.DOCS_URL}/quotes`)
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
  if (
    process.platform === 'win32' &&
    (await new Promise((resolve) => {
      cp.exec(`taskkill /pid ${pid} /t /f`, (err) => resolve(!err))
    }))
  )
    return

  for (const p of await ps.tree({ pid, recursive: true })) {
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
      return new Promise((_res, _rej) => {
        const onend = () => _res(res(proxyOverride(stream, from.output)))
        stream
          .once('error', (e) => _rej(rej(e)))
          .once('finish', onend)
          .once(EPF, onend)
      })
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
  env = process.env,
  allowed = ENV_OPTS
): Options {
  return Object.entries(env).reduce<Options>((m, [k, v]) => {
    if (v && k.startsWith(prefix)) {
      const _k = toCamelCase(k.slice(prefix.length))
      const _v = parseBool(v)
      if (allowed.has(_k)) (m as any)[_k] = _v
    }
    return m
  }, defs)
}
