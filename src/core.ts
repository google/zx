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
  type StdioOptions,
  type IOType,
  spawn,
  spawnSync,
} from 'node:child_process'
import { type Encoding } from 'node:crypto'
import { type AsyncHook, AsyncLocalStorage, createHook } from 'node:async_hooks'
import { type Readable, type Writable } from 'node:stream'
import { inspect } from 'node:util'
import { EOL as _EOL } from 'node:os'
import {
  exec,
  buildCmd,
  chalk,
  which,
  ps,
  VoidWritable,
  type ChalkInstance,
  type RequestInfo,
  type RequestInit,
  type TSpawnStore,
} from './vendor-core.js'
import {
  type Duration,
  errnoMessage,
  exitCodeInfo,
  formatCmd,
  getCallerLocation,
  isString,
  isStringLiteral,
  noop,
  once,
  parseDuration,
  preferLocalBin,
  quote,
  quotePowerShell,
} from './util.js'

const CWD = Symbol('processCwd')
const SYNC = Symbol('syncExec')
const EOL = Buffer.from(_EOL)
const SIGTERM = 'SIGTERM'
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
  shell:          string | boolean
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
export const defaults: Options = {
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

    let resolve: Resolve, reject: Resolve
    const process = new ProcessPromise((...args) => ([resolve, reject] = args))
    const cmd = buildCmd(
      $.quote as typeof quote,
      pieces as TemplateStringsArray,
      args
    ) as string
    const sync = snapshot[SYNC]

    process._bind(
      cmd,
      from,
      resolve!,
      (v: ProcessOutput) => {
        reject!(v)
        if (sync) throw v
      },
      snapshot
    )

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

type Resolve = (out: ProcessOutput) => void

export class ProcessPromise extends Promise<ProcessOutput> {
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
  private _resolved = false
  private _halted?: boolean
  private _piped = false
  private _zurk: ReturnType<typeof exec> | null = null
  private _output: ProcessOutput | null = null
  private _reject: Resolve = noop
  private _resolve: Resolve = noop

  _bind(
    cmd: string,
    from: string,
    resolve: Resolve,
    reject: Resolve,
    options: Options
  ) {
    this._command = cmd
    this._from = from
    this._resolve = resolve
    this._reject = reject
    this._snapshot = { ac: new AbortController(), ...options }
  }

  run(): ProcessPromise {
    if (this.child) return this // The _run() can be called from a few places.

    const $ = this._snapshot
    const self = this
    const input = ($.input as ProcessPromise | ProcessOutput)?.stdout ?? $.input

    if ($.timeout) this.timeout($.timeout, $.timeoutSignal)
    if ($.preferLocal) {
      const dirs =
        $.preferLocal === true ? [$.cwd, $[CWD]] : [$.preferLocal].flat()
      $.env = preferLocalBin($.env, ...dirs)
    }

    $.log({
      kind: 'cmd',
      cmd: this._command,
      verbose: self.isVerbose(),
    })

    this._zurk = exec({
      input,
      cmd: $.prefix + self._command + $.postfix,
      cwd: $.cwd ?? $[CWD],
      ac: $.ac,
      signal: $.signal,
      shell: isString($.shell) ? $.shell : true,
      env: $.env,
      spawn: $.spawn,
      spawnSync: $.spawnSync,
      store: $.store,
      stdio: self._stdio ?? $.stdio,
      sync: $[SYNC],
      detached: $.detached,
      run: (cb) => cb(),
      on: {
        start: () => {
          self._timeout && self.timeout(self._timeout, self._timeoutSignal)
        },
        stdout: (data) => {
          // If process is piped, don't print output.
          if (self._piped) return
          $.log({ kind: 'stdout', data, verbose: self.isVerbose() })
        },
        stderr: (data) => {
          // Stderr should be printed regardless of piping.
          $.log({ kind: 'stderr', data, verbose: !self.isQuiet() })
        },
        // prettier-ignore
        end: (data, c) => {
          self._resolved = true
          const { error, status, signal, duration, ctx } = data
          const { stdout, stderr, stdall } = ctx.store
          const dto: ProcessOutputLazyDto = {
            // Lazy getters
            code: () => status,
            signal: () => signal,
            duration: () => duration,
            stdout: once(() => stdout.join('')),
            stderr: once(() => stderr.join('')),
            stdall: once(() => stdall.join('')),
            message: once(() => ProcessOutput.getExitMessage(
              status,
              signal,
              dto.stderr(),
              self._from
            )),
            ...error && {
              code: () => null,
              signal: () => null,
              message: () => ProcessOutput.getErrorMessage(error, self._from)
            }
          }

          // Ensures EOL
          if (stdout.length && !stdout[stdout.length - 1]!.toString().endsWith('\n')) c.on.stdout!(EOL, c)
          if (stderr.length && !stderr[stderr.length - 1]!.toString().endsWith('\n')) c.on.stderr!(EOL, c)

          const output = new ProcessOutput(dto)
          self._output = output

          if (error || status !== 0 && !self.isNothrow()) {
            self._reject(output)
          } else {
            self._resolve(output)
          }
        },
      },
    })

    return this
  }

  // Essentials
  pipe(
    dest: Writable | ProcessPromise | TemplateStringsArray,
    ...args: any[]
  ): ProcessPromise {
    if (isStringLiteral(dest, ...args))
      return this.pipe($(dest as TemplateStringsArray, ...args))
    if (isString(dest))
      throw new Error('The pipe() method does not take strings. Forgot $?')

    this._piped = true
    const { store, ee, fulfilled } = this._zurk!
    const from = new VoidWritable()
    const fill = () => {
      for (const chunk of store.stdout) {
        from.write(chunk)
      }
    }

    if (fulfilled) {
      fill()
      from.end()
    } else {
      const onStdout = (chunk: string | Buffer) => from.write(chunk)
      ee.once('stdout', () => {
        fill()
        ee.on('stdout', onStdout)
      }).once('end', () => {
        ee.removeListener('stdout', onStdout)
        from.end()
      })
    }

    if (dest instanceof ProcessPromise) {
      this.catch((e) => (dest.isNothrow() ? noop : dest._reject(e)))
      from.pipe(dest.stdin)
      return dest
    }

    from.pipe(dest as Writable)
    return this
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
  halt() {
    return this
  }

  // Getters
  get pid() {
    return this.child?.pid
  }

  get cmd() {
    return this._command
  }

  get child() {
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

  get signal() {
    return this._snapshot.signal || this._snapshot.ac?.signal
  }

  get output() {
    return this._output
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

  nothrow(): ProcessPromise {
    this._nothrow = true
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

  timeout(d: Duration, signal = $.timeoutSignal): ProcessPromise {
    this._timeout = parseDuration(d)
    this._timeoutSignal = signal

    if (this._timeoutId) clearTimeout(this._timeoutId)
    if (this._timeout) {
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
  isHalted(): boolean {
    return this._halted ?? this._snapshot.halt ?? false
  }

  isQuiet(): boolean {
    return this._quiet ?? this._snapshot.quiet
  }

  isVerbose(): boolean {
    return (this._verbose ?? this._snapshot.verbose) && !this.isQuiet()
  }

  isNothrow(): boolean {
    return this._nothrow ?? this._snapshot.nothrow
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
    if (this.isHalted() && !this.child) {
      throw new Error('The process is halted!')
    }
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
}

type GettersRecord<T extends Record<any, any>> = { [K in keyof T]: () => T[K] }

type ProcessOutputLazyDto = GettersRecord<{
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  stdall: string
  message: string
  duration: number
}>

export class ProcessOutput extends Error {
  private readonly _code: number | null = null
  private readonly _signal: NodeJS.Signals | null
  private readonly _stdout: string
  private readonly _stderr: string
  private readonly _combined: string
  private readonly _duration: number

  constructor(dto: ProcessOutputLazyDto)
  constructor(
    code: number | null,
    signal: NodeJS.Signals | null,
    stdout: string,
    stderr: string,
    combined: string,
    message: string,
    duration?: number
  )
  constructor(
    code: number | null | ProcessOutputLazyDto,
    signal: NodeJS.Signals | null = null,
    stdout: string = '',
    stderr: string = '',
    combined: string = '',
    message: string = '',
    duration: number = 0
  ) {
    super(message)
    this._signal = signal
    this._stdout = stdout
    this._stderr = stderr
    this._combined = combined
    this._duration = duration
    if (code !== null && typeof code === 'object') {
      Object.defineProperties(this, {
        _code: { get: code.code },
        _signal: { get: code.signal },
        _duration: { get: code.duration },
        _stdout: { get: code.stdout },
        _stderr: { get: code.stderr },
        _combined: { get: code.stdall },
        message: { get: code.message },
      })
    } else {
      this._code = code
    }
  }

  toString() {
    return this._combined
  }

  json<T = any>(): T {
    return JSON.parse(this._combined)
  }

  buffer() {
    return Buffer.from(this._combined)
  }

  blob(type = 'text/plain') {
    if (!globalThis.Blob)
      throw new Error(
        'Blob is not supported in this environment. Provide a polyfill'
      )
    return new Blob([this.buffer()], { type })
  }

  text(encoding: Encoding = 'utf8') {
    return encoding === 'utf8'
      ? this.toString()
      : this.buffer().toString(encoding)
  }

  lines() {
    return this.valueOf().split(/\r?\n/)
  }

  valueOf() {
    return this._combined.trim()
  }

  get stdout() {
    return this._stdout
  }

  get stderr() {
    return this._stderr
  }

  get exitCode() {
    return this._code
  }

  get signal() {
    return this._signal
  }

  get duration() {
    return this._duration
  }

  static getExitMessage(
    code: number | null,
    signal: NodeJS.Signals | null,
    stderr: string,
    from: string
  ) {
    let message = `exit code: ${code}`
    if (code != 0 || signal != null) {
      message = `${stderr || '\n'}    at ${from}`
      message += `\n    exit code: ${code}${
        exitCodeInfo(code) ? ' (' + exitCodeInfo(code) + ')' : ''
      }`
      if (signal != null) {
        message += `\n    signal: ${signal}`
      }
    }

    return message
  }

  static getErrorMessage(err: NodeJS.ErrnoException, from: string) {
    return (
      `${err.message}\n` +
      `    errno: ${err.errno} (${errnoMessage(err.errno)})\n` +
      `    code: ${err.code}\n` +
      `    at ${from}`
    )
  }

  [inspect.custom]() {
    let stringify = (s: string, c: ChalkInstance) =>
      s.length === 0 ? "''" : c(inspect(s))
    return `ProcessOutput {
  stdout: ${stringify(this.stdout, chalk.green)},
  stderr: ${stringify(this.stderr, chalk.red)},
  signal: ${inspect(this.signal)},
  exitCode: ${(this.exitCode === 0 ? chalk.green : chalk.red)(this.exitCode)}${
    exitCodeInfo(this.exitCode)
      ? chalk.grey(' (' + exitCodeInfo(this.exitCode) + ')')
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

  $.log({ kind: 'cd', dir })
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

export type LogEntry = {
  verbose?: boolean
} & (
  | {
      kind: 'cmd'
      cmd: string
    }
  | {
      kind: 'stdout' | 'stderr'
      data: Buffer
    }
  | {
      kind: 'cd'
      dir: string
    }
  | {
      kind: 'fetch'
      url: RequestInfo
      init?: RequestInit
    }
  | {
      kind: 'retry'
      error: string
    }
  | {
      kind: 'custom'
      data: any
    }
)

export function log(entry: LogEntry) {
  if (!(entry.verbose ?? $.verbose)) return
  switch (entry.kind) {
    case 'cmd':
      process.stderr.write(formatCmd(entry.cmd))
      break
    case 'stdout':
    case 'stderr':
    case 'custom':
      process.stderr.write(entry.data)
      break
    case 'cd':
      process.stderr.write('$ ' + chalk.greenBright('cd') + ` ${entry.dir}\n`)
      break
    case 'fetch':
      const init = entry.init ? ' ' + inspect(entry.init) : ''
      process.stderr.write(
        '$ ' + chalk.greenBright('fetch') + ` ${entry.url}${init}\n`
      )
      break
    case 'retry':
      process.stderr.write(entry.error + '\n')
  }
}
