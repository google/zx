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
import { type BlobPart, Buffer } from 'node:buffer'
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
} from './vendor-core.ts'
import {
  type Duration,
  isString,
  isStringLiteral,
  iteratorToArray,
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

export { bus } from './internals.ts'
export { default as path } from 'node:path'
export * as os from 'node:os'
export { Fail } from './error.ts'
export { log, type LogEntry } from './log.ts'
export { chalk, which, ps } from './vendor-core.ts'
export { type Duration, quote, quotePowerShell } from './util.ts'

const CWD = Symbol('processCwd')
const SYNC = Symbol('syncExec')
const EPF = Symbol('end-piped-from')
const SHOT = Symbol('snapshot')
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
type Snapshot = Options & {
  from:           string
  pieces:         TemplateStringsArray
  args:           string[]
  cmd:            string
  ee:             EventEmitter
  ac:             AbortController
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

const storage = new AsyncLocalStorage<Options>()

const getStore = () => storage.getStore() || defaults

const getSnapshot = (
  opts: Options,
  from: string,
  pieces: TemplateStringsArray,
  args: any[]
): Snapshot => ({
  ...opts,
  ac: opts.ac || new AbortController(),
  ee: new EventEmitter(),
  from,
  pieces,
  args,
  cmd: '',
})

export function within<R>(callback: () => R): R {
  return storage.run({ ...getStore() }, callback)
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

// The zx
export type $ = Shell & Options

export const $: $ = new Proxy<$>(
  // prettier-ignore
  function (pieces: TemplateStringsArray | Partial<Options>, ...args: any[]) {
    const opts = getStore()
    if (!Array.isArray(pieces)) {
      return function (this: any, ...args: any) {
        return within(() => Object.assign($, opts, pieces).apply(this, args))
      }
    }
    const from = Fail.getCallerLocation()
    const cb: PromiseCallback = () => (cb[SHOT] = getSnapshot(opts, from, pieces as TemplateStringsArray, args))
    const pp = new ProcessPromise(cb)

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

type Reject = (error: ProcessOutput | Error) => void

type PromiseCallback = {
  (resolve: Resolve, reject: Reject): void
  [SHOT]?: Snapshot
}

type PromisifiedStream<D extends Writable = Writable> = D &
  PromiseLike<ProcessOutput & D> & { run(): void }

type PipeAcceptor = Writable | ProcessPromise
type PipeDest = PipeAcceptor | TemplateStringsArray | string
type PipeMethod = {
  (dest: TemplateStringsArray, ...args: any[]): ProcessPromise
  (file: string): PromisifiedStream
  <D extends Writable>(dest: D): PromisifiedStream<D>
  <D extends ProcessPromise>(dest: D): D
}

export class ProcessPromise extends Promise<ProcessOutput> {
  private _stage: ProcessStage = 'initial'
  private _id = randomId()
  private _snapshot!: Snapshot
  private _timeoutId?: ReturnType<typeof setTimeout>
  private _piped = false
  private _stdin = new VoidStream()
  private _zurk: ReturnType<typeof exec> | null = null
  private _output: ProcessOutput | null = null
  private _resolve!: Resolve
  private _reject!: Reject

  constructor(executor: PromiseCallback) {
    let resolve: Resolve
    let reject: Reject
    super((...args) => {
      ;[resolve = noop, reject = noop] = args
      executor(...args)
    })

    const snapshot = executor[SHOT]
    if (snapshot) {
      this._snapshot = snapshot
      this._resolve = resolve!
      this._reject = reject!
      if (snapshot.halt) this._stage = 'halted'
      try {
        this.build()
      } catch (err) {
        this.finalize(ProcessOutput.fromError(err as Error), true)
      }
    } else ProcessPromise.disarm(this)
  }
  // prettier-ignore
  private build(): void {
    const $ = this._snapshot
    if (!$.shell)
      throw new Fail(`No shell is available: ${Fail.DOCS_URL}/shell`)
    if (!$.quote)
      throw new Fail(`No quote function is defined: ${Fail.DOCS_URL}/quotes`)
    if ($.pieces.some((p) => p == null))
      throw new Fail(`Malformed command at ${$.from}`)

    $.cmd = buildCmd(
      $.quote!,
      $.pieces as TemplateStringsArray,
      $.args
    ) as string
  }
  run(): this {
    ProcessPromise.bus.runBack(this)
    if (this.isRunning() || this.isSettled()) return this // The _run() can be called from a few places.
    this._stage = 'running'

    const self = this
    const $ = self._snapshot
    const { id, cwd } = self

    if (!fs.existsSync(cwd)) {
      this.finalize(
        ProcessOutput.fromError(
          new Error(`The working directory '${cwd}' does not exist.`)
        )
      )
      return this
    }

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
          error => self.finalize(ProcessOutput.fromError(error))
        ) || cb()
      },
      on: {
        start: () => {
          $.log({ kind: 'cmd', cmd: $.cmd, cwd, verbose: self.isVerbose(), id })
          self.timeout($.timeout, $.timeoutSignal)
        },
        stdout: (data) => {
          // If the process is piped, don't print its output.
          $.log({ kind: 'stdout', data, verbose: !self._piped && self.isVerbose(), id })
        },
        stderr: (data) => {
          // Stderr should be printed regardless of piping.
          $.log({ kind: 'stderr', data, verbose: !self.isQuiet(), id })
        },
        end: (data, c) => {
          const { error: _error, status, signal: __signal, duration, ctx: { store }} = data
          const { stdout, stderr } = store
          const { cause, exitCode, signal: _signal } = self._breakerData || {}

          const signal = _signal ?? __signal
          const code = exitCode ?? status
          const error = cause ?? _error
          const output = new ProcessOutput({
            code,
            signal,
            error,
            duration,
            store,
            from: $.from,
          })

          $.log({ kind: 'end', signal, exitCode: code, duration, error, verbose: self.isVerbose(), id })

          // Ensures EOL
          if (stdout.length && getLast(getLast(stdout)) !== BR_CC) c.on.stdout!(EOL, c)
          if (stderr.length && getLast(getLast(stderr)) !== BR_CC) c.on.stderr!(EOL, c)

          self.finalize(output)
        },
      },
    })

    return this
  }
  private _breakerData?: Partial<
    Pick<ProcessOutput, 'exitCode' | 'signal' | 'cause'>
  >

  private break(
    exitCode?: ProcessOutput['exitCode'],
    signal?: ProcessOutput['signal'],
    cause?: ProcessOutput['cause']
  ): void {
    if (!this.isRunning()) return
    this._breakerData = { exitCode, signal, cause }
    this.kill(signal)
  }

  private finalize(output: ProcessOutput, legacy = false): void {
    if (this.isSettled()) return
    this._output = output
    ProcessPromise.bus.unpipeBack(this)
    if (output.ok || this.isNothrow()) {
      this._stage = 'fulfilled'
      this._resolve(output)
    } else {
      this._stage = 'rejected'
      if (legacy) {
        this._resolve(output) // to avoid unhandledRejection alerts
        throw output.cause || output
      }
      this._reject(output)
      if (this.sync) throw output
    }
  }

  abort(reason?: string) {
    if (this.isSettled()) throw new Fail('Too late to abort the process.')
    if (this.signal !== this.ac.signal)
      throw new Fail('The signal is controlled by another process.')
    if (!this.child)
      throw new Fail('Trying to abort a process without creating one.')

    this.ac.abort(reason)
  }

  kill(signal?: NodeJS.Signals | null): Promise<void> {
    if (this.isSettled()) throw new Fail('Too late to kill the process.')
    if (!this.child)
      throw new Fail('Trying to kill a process without creating one.')
    if (!this.pid) throw new Fail('The process pid is undefined.')

    return $.kill(this.pid, signal || this._snapshot.killSignal || $.killSignal)
  }

  // Configurators
  stdio(
    stdin: IOType | StdioOptions,
    stdout: IOType = 'pipe',
    stderr: IOType = 'pipe'
  ): this {
    this._snapshot.stdio = Array.isArray(stdin)
      ? stdin
      : [stdin, stdout, stderr]
    return this
  }

  nothrow(v = true): this {
    this._snapshot.nothrow = v
    return this
  }

  quiet(v = true): this {
    this._snapshot.quiet = v
    return this
  }

  verbose(v = true): this {
    this._snapshot.verbose = v
    return this
  }

  timeout(d: Duration = 0, signal = $.timeoutSignal): this {
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

  get cwd(): string {
    return this._snapshot.cwd || this._snapshot[CWD]
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

  // Piping
  // prettier-ignore
  get pipe(): PipeMethod & {
    [key in keyof TSpawnStore]: PipeMethod
  } {
    const getPipeMethod = (kind: keyof TSpawnStore) => this._pipe.bind(this, kind) as PipeMethod
    const stdout = getPipeMethod('stdout')
    const stderr = getPipeMethod('stderr')
    const stdall = getPipeMethod('stdall')
    return Object.assign(stdout, { stdout, stderr, stdall })
  }

  unpipe(to?: PipeAcceptor): this {
    ProcessPromise.bus.unpipe(this, to)
    return this
  }

  // prettier-ignore
  private _pipe(source: keyof TSpawnStore, dest: PipeDest, ...args: any[]): PromisifiedStream | ProcessPromise {
    if (isString(dest))
      return this._pipe(source, fs.createWriteStream(dest))

    if (isStringLiteral(dest, ...args))
      return this._pipe(
        source,
        $({
          halt: true,
          signal: this.signal,
        })(dest as TemplateStringsArray, ...args)
      )

    const isP = dest instanceof ProcessPromise
    if (isP && dest.isSettled()) throw new Fail('Cannot pipe to a settled process.')
    if (!isP && dest.writableEnded) throw new Fail('Cannot pipe to a closed stream.')

    this._piped = true
    ProcessPromise.bus.pipe(this, dest)

    const { ee } = this._snapshot
    const output = this.output
    const from = new VoidStream()
    const check = () => !!ProcessPromise.bus.refs.get(this)?.has(dest)
    const end = () => {
      if (!check()) return
      setImmediate(() => {
        ProcessPromise.bus.unpipe(this, dest)
        ProcessPromise.bus.sources(dest).length === 0 && from.end()
      })
    }
    const fill = () => {
      for (const chunk of this._zurk!.store[source]) from.write(chunk)
    }
    const fillSettled = () => {
      if (!output) return
      if (isP && !output.ok) dest.break(output.exitCode, output.signal, output.cause)
      fill()
      end()
    }

    if (!output) {
      const onData = (chunk: string | Buffer) => check() && from.write(chunk)
      ee
        .once(source, () => {
          fill()
          ee.on(source, onData)
        })
        .once('end', () => {
          ee.removeListener(source, onData)
          end()
        })
    }

    if (isP) {
      from.pipe(dest._stdin)
      if (this.isHalted()) ee.once('start', () => dest.run())
      else {
        dest.run()
        this.catch((e) => dest.break(e.exitCode, e.signal, e.cause))
      }
      fillSettled()
      return dest
    }

    from.once('end', () => dest.emit(EPF)).pipe(dest)
    fillSettled()
    return ProcessPromise.promisifyStream(dest, this)
  }

  // prettier-ignore
  private static bus = {
    refs: new Map<ProcessPromise, Set<PipeAcceptor>>,
    streams: new WeakMap<Writable, PromisifiedStream>(),
    pipe(from: ProcessPromise, to: PipeAcceptor) {
      const set = this.refs.get(from) || (this.refs.set(from, new Set())).get(from)!
      set.add(to)
    },
    unpipe(from: ProcessPromise, to?: PipeAcceptor) {
      const set = this.refs.get(from)
      if (!set) return
      if (to) set.delete(to)
      if (set.size) return
      this.refs.delete(from)
      from._piped = false
    },
    unpipeBack(to: ProcessPromise, from?: ProcessPromise) {
      if (from) return this.unpipe(from, to)
      for (const _from of this.refs.keys()) {
        this.unpipe(_from, to)
      }
    },
    runBack(p: PipeAcceptor) {
      for (const from of this.sources(p)) {
        if (from instanceof ProcessPromise) from.run()
        else this.streams.get(from)?.run()
      }
    },
    sources(p: PipeAcceptor): PipeAcceptor[] {
      const refs = []
      for (const [from, set] of this.refs.entries()) {
        set.has(p) && refs.push(from)
      }
      return refs
    }
  }

  private static promisifyStream = <S extends Writable>(
    stream: S,
    from: ProcessPromise
  ): PromisifiedStream<S> => {
    const proxy =
      ProcessPromise.bus.streams.get(stream) ||
      proxyOverride(stream as PromisifiedStream<S>, {
        then(res: any = noop, rej: any = noop) {
          return new Promise((_res, _rej) => {
            const end = () => _res(res(proxyOverride(stream, from.output)))
            stream
              .once('error', (e) => _rej(rej(e)))
              .once('finish', end)
              .once(EPF, end)
          })
        },
        run() {
          from.run()
        },
        pipe(...args: any) {
          const dest = stream.pipe.apply(stream, args)
          return dest instanceof ProcessPromise
            ? dest
            : ProcessPromise.promisifyStream(dest as Writable, from)
        },
      })

    ProcessPromise.bus.streams.set(stream, proxy as any)
    return proxy as PromisifiedStream<S>
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

    for await (const chunk of this.stdout || []) {
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
    code?: number | null,
    signal?: NodeJS.Signals | null,
    stdout?: string,
    stderr?: string,
    stdall?: string,
    message?: string,
    duration?: number
  )
  // prettier-ignore
  constructor(
    code: number | null | ProcessDto = null,
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
      cause: { get() { return dto.error }, enumerable: false },
      stdout: { get: once(() => bufArrJoin(dto.store.stdout)) },
      stderr: { get: once(() => bufArrJoin(dto.store.stderr)) },
      stdall: { get: once(() => bufArrJoin(dto.store.stdall)) },
      message: { get: once(() =>
        dto.error || message
          ? ProcessOutput.getErrorMessage(dto.error || new Error(message), dto.from)
          : ProcessOutput.getExitMessage(
            dto.code,
            dto.signal,
            this.stderr,
            dto.from,
            this.stderr.trim() ? '' : ProcessOutput.getErrorDetails(this.lines())
          )
      )},
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
    return new Blob([this.buffer() as BlobPart], { type })
  }

  text(encoding: Encoding = 'utf8'): string {
    return encoding === 'utf8'
      ? this.toString()
      : this.buffer().toString(encoding)
  }

  lines(delimiter?: string | RegExp): string[] {
    return iteratorToArray(this[Symbol.iterator](delimiter))
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
  // prettier-ignore
  *[Symbol.iterator](dlmtr: Options['delimiter'] = this._dto.delimiter || $.delimiter || DLMTR): Iterator<string> {
    const memo: (string | undefined)[] = []
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

  static fromError(error: Error): ProcessOutput {
    const output = new ProcessOutput()
    output._dto.error = error
    return output
  }
}

export const useBash = (): void => setShell('bash', false)
export const usePwsh = (): void => setShell('pwsh')
export const usePowerShell = (): void => setShell('powershell.exe')
function setShell(n: string, ps = true) {
  $.shell = which.sync(n)
  $.prefix = ps ? '' : 'set -euo pipefail;'
  $.postfix = ps ? '; exit $LastExitCode' : ''
  $.quote = ps ? quotePowerShell : quote
}

try {
  const { shell, prefix, postfix } = $
  if (process.platform === 'win32') {
    $.shell = true
    $.prefix = ''
    $.postfix = ''
    $.quote = quote
  } else {
    useBash()
  }
  if (isString(shell)) $.shell = shell
  if (isString(prefix)) $.prefix = prefix
  if (isString(postfix)) $.postfix = postfix
} catch (err) {}

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

export async function kill(
  pid: number | `${number}`,
  signal = $.killSignal || SIGTERM
) {
  if (
    (typeof pid !== 'number' && typeof pid !== 'string') ||
    !/^\d+$/.test(pid as string)
  )
    throw new Fail(`Invalid pid: ${pid}`)

  $.log({ kind: 'kill', pid, signal, verbose: !$.quiet && $.verbose })
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
