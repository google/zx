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

import assert from 'node:assert'
import { spawn, spawnSync, StdioOptions, IOType } from 'node:child_process'
import { AsyncHook, AsyncLocalStorage, createHook } from 'node:async_hooks'
import { Readable, Writable } from 'node:stream'
import { inspect } from 'node:util'
import {
  exec,
  buildCmd,
  chalk,
  which,
  ps,
  type ChalkInstance,
  RequestInfo,
  RequestInit,
} from './vendor.js'
import {
  Duration,
  errnoMessage,
  exitCodeInfo,
  formatCmd,
  getCallerLocation,
  noop,
  parseDuration,
  quote,
  quotePowerShell,
  noquote,
} from './util.js'

export interface Shell {
  (pieces: TemplateStringsArray, ...args: any[]): ProcessPromise
  (opts: Partial<Options>): Shell
  sync: {
    (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput
    (opts: Partial<Options>): Shell
  }
}

const processCwd = Symbol('processCwd')
const syncExec = Symbol('syncExec')

export interface Options {
  [processCwd]: string
  [syncExec]: boolean
  cwd?: string
  ac?: AbortController
  signal?: AbortSignal
  input?: string | Buffer | Readable | ProcessOutput | ProcessPromise
  stdio: StdioOptions
  verbose: boolean
  sync: boolean
  env: NodeJS.ProcessEnv
  shell: string | boolean
  nothrow: boolean
  prefix: string
  postfix: string
  quote: typeof quote
  quiet: boolean
  detached: boolean
  spawn: typeof spawn
  spawnSync: typeof spawnSync
  log: typeof log
  kill: typeof kill
}

const storage = new AsyncLocalStorage<Options>()
const cwdSyncHook: AsyncHook & { enabled?: boolean } = createHook({
  init: syncCwd,
  before: syncCwd,
  promiseResolve: syncCwd,
  after: syncCwd,
  destroy: syncCwd,
})

export function syncProcessCwd(flag: boolean = true) {
  if (flag) cwdSyncHook.enable()
  else cwdSyncHook.disable()
}

export const defaults: Options = {
  [processCwd]: process.cwd(),
  [syncExec]: false,
  verbose: false,
  env: process.env,
  sync: false,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
  nothrow: false,
  quiet: false,
  prefix: '',
  postfix: '',
  quote: noquote,
  detached: false,
  spawn,
  spawnSync,
  log,
  kill,
}

export function usePowerShell() {
  $.shell = which.sync('powershell.exe')
  $.prefix = ''
  $.postfix = '; exit $LastExitCode'
  $.quote = quotePowerShell
}

export function useBash() {
  $.shell = which.sync('bash')
  $.prefix = 'set -euo pipefail;'
  $.quote = quote
}

function checkShell() {
  if (!$.shell) {
    throw new Error(`shell is not available: setup guide goes here`)
  }
}

function getStore() {
  return storage.getStore() || defaults
}

export const $: Shell & Options = new Proxy<Shell & Options>(
  function (pieces, ...args) {
    checkShell()

    if (!Array.isArray(pieces)) {
      return function (this: any, ...args: any) {
        const self = this
        return within(() => {
          return Object.assign($, pieces).apply(self, args)
        })
      }
    }
    const from = getCallerLocation()
    if (pieces.some((p) => p == undefined)) {
      throw new Error(`Malformed command at ${from}`)
    }
    let resolve: Resolve, reject: Resolve
    const promise = new ProcessPromise((...args) => ([resolve, reject] = args))
    const cmd = buildCmd(
      $.quote,
      pieces as TemplateStringsArray,
      args
    ) as string
    const snapshot = getStore()
    const sync = snapshot[syncExec]
    const callback = () => promise.isHalted || promise.run()

    promise._bind(
      cmd,
      from,
      resolve!,
      (v: ProcessOutput) => {
        reject!(v)
        if (sync) throw v
      },
      snapshot
    )
    // Postpone run to allow promise configuration.
    sync ? callback() : setImmediate(callback)

    return sync ? promise.output : promise
  } as Shell & Options,
  {
    set(_, key, value) {
      const target = key in Function.prototype ? _ : getStore()
      Reflect.set(target, key === 'sync' ? syncExec : key, value)

      return true
    },
    get(_, key) {
      if (key === 'sync') return $({ sync: true })

      const target = key in Function.prototype ? _ : getStore()
      return Reflect.get(target, key)
    },
  }
)
try {
  useBash()
} catch (err) {}

type Resolve = (out: ProcessOutput) => void

export class ProcessPromise extends Promise<ProcessOutput> {
  private _command = ''
  private _from = ''
  private _resolve: Resolve = noop
  private _reject: Resolve = noop
  private _snapshot = getStore()
  private _stdio?: StdioOptions
  private _nothrow?: boolean
  private _quiet?: boolean
  private _timeout?: number
  private _timeoutSignal = 'SIGTERM'
  private _resolved = false
  private _halted = false
  private _piped = false
  private _zurk: ReturnType<typeof exec> | null = null
  private _output: ProcessOutput | null = null
  _prerun = noop
  _postrun = noop

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
    this._snapshot = { ...options }
  }

  run(): ProcessPromise {
    if (this.child) return this // The _run() can be called from a few places.
    this._prerun() // In case $1.pipe($2), the $2 returned, and on $2._run() invoke $1._run().

    const $ = this._snapshot
    const self = this
    const input = ($.input as ProcessPromise | ProcessOutput)?.stdout ?? $.input

    if (input) this.stdio('pipe')

    $.log({
      kind: 'cmd',
      cmd: this._command,
      verbose: self.isVerbose(),
    })

    this._zurk = exec({
      input,
      cmd: $.prefix + self._command + $.postfix,
      cwd: $.cwd ?? $[processCwd],
      ac: $.ac,
      signal: $.signal,
      shell: typeof $.shell === 'string' ? $.shell : true,
      env: $.env,
      spawn: $.spawn,
      spawnSync: $.spawnSync,
      stdio: self._stdio ?? $.stdio,
      sync: $[syncExec],
      detached: $.detached,
      run: (cb) => cb(),
      on: {
        start: () => {
          if (self._timeout) {
            const t = setTimeout(
              () => self.kill(self._timeoutSignal),
              self._timeout
            )
            self.finally(() => clearTimeout(t)).catch(noop)
          }
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
        end: ({ error, stdout, stderr, stdall, status, signal }) => {
          self._resolved = true

          if (error) {
            const message = ProcessOutput.getErrorMessage(error, self._from)
            // Should we enable this?
            // (nothrow ? self._resolve : self._reject)(
            const output = new ProcessOutput(
              null,
              null,
              stdout,
              stderr,
              stdall,
              message
            )
            self._output = output
            self._reject(output)
          } else {
            const message = ProcessOutput.getExitMessage(
              status,
              signal,
              stderr,
              self._from
            )
            const output = new ProcessOutput(
              status,
              signal,
              stdout,
              stderr,
              stdall,
              message
            )
            self._output = output
            if (status === 0 || (self._nothrow ?? $.nothrow)) {
              self._resolve(output)
            } else {
              self._reject(output)
            }
          }
        },
      },
    })

    this._postrun() // In case $1.pipe($2), after both subprocesses are running, we can pipe $1.stdout to $2.stdin.

    return this
  }

  get child() {
    return this._zurk?.child
  }

  get stdin(): Writable {
    this.stdio('pipe')
    this.run()
    assert(this.child)
    if (this.child.stdin == null)
      throw new Error('The stdin of subprocess is null.')
    return this.child.stdin
  }

  get stdout(): Readable {
    this.run()
    assert(this.child)
    if (this.child.stdout == null)
      throw new Error('The stdout of subprocess is null.')
    return this.child.stdout
  }

  get stderr(): Readable {
    this.run()
    assert(this.child)
    if (this.child.stderr == null)
      throw new Error('The stderr of subprocess is null.')
    return this.child.stderr
  }

  get exitCode(): Promise<number | null> {
    return this.then(
      (p) => p.exitCode,
      (p) => p.exitCode
    )
  }

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
    if (this.isHalted && !this.child) {
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

  pipe(dest: Writable | ProcessPromise): ProcessPromise {
    if (typeof dest == 'string')
      throw new Error('The pipe() method does not take strings. Forgot $?')
    if (this._resolved) {
      if (dest instanceof ProcessPromise) dest.stdin.end() // In case of piped stdin, we may want to close stdin of dest as well.
      throw new Error(
        "The pipe() method shouldn't be called after promise is already resolved!"
      )
    }
    this._piped = true
    if (dest instanceof ProcessPromise) {
      dest.stdio('pipe')
      dest._prerun = this.run.bind(this)
      dest._postrun = () => {
        if (!dest.child)
          throw new Error(
            'Access to stdin of pipe destination without creation a subprocess.'
          )
        this.stdout.pipe(dest.stdin)
      }
      return dest
    } else {
      this._postrun = () => this.stdout.pipe(dest)
      return this
    }
  }

  abort(reason?: string) {
    if (!this.child)
      throw new Error('Trying to abort a process without creating one.')

    this._zurk?.ac.abort(reason)
  }

  async kill(signal = 'SIGTERM'): Promise<void> {
    if (!this.child)
      throw new Error('Trying to kill a process without creating one.')
    if (!this.child.pid) throw new Error('The process pid is undefined.')

    return $.kill(this.child.pid, signal)
  }

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

  quiet(): ProcessPromise {
    this._quiet = true
    return this
  }

  isQuiet(): boolean {
    return this._quiet ?? this._snapshot.quiet
  }

  isVerbose(): boolean {
    return this._snapshot.verbose && !this.isQuiet()
  }

  timeout(d: Duration, signal = 'SIGTERM'): ProcessPromise {
    this._timeout = parseDuration(d)
    this._timeoutSignal = signal
    return this
  }

  halt(): ProcessPromise {
    this._halted = true
    return this
  }

  get isHalted(): boolean {
    return this._halted
  }

  get output() {
    return this._output
  }
}

export class ProcessOutput extends Error {
  private readonly _code: number | null
  private readonly _signal: NodeJS.Signals | null
  private readonly _stdout: string
  private readonly _stderr: string
  private readonly _combined: string

  constructor(
    code: number | null,
    signal: NodeJS.Signals | null,
    stdout: string,
    stderr: string,
    combined: string,
    message: string
  ) {
    super(message)
    this._code = code
    this._signal = signal
    this._stdout = stdout
    this._stderr = stderr
    this._combined = combined
  }

  toString() {
    return this._combined
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
  }
}`
  }
}

export function within<R>(callback: () => R): R {
  return storage.run({ ...getStore() }, callback)
}

function syncCwd() {
  if ($[processCwd] != process.cwd()) process.chdir($[processCwd])
}

export function cd(dir: string | ProcessOutput) {
  if (dir instanceof ProcessOutput) {
    dir = dir.toString().trim()
  }

  $.log({ kind: 'cd', dir })
  process.chdir(dir)
  $[processCwd] = process.cwd()
}

export async function kill(pid: number, signal?: string) {
  let children = await ps.tree({ pid, recursive: true })
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

export type LogEntry =
  | {
      kind: 'cmd'
      verbose: boolean
      cmd: string
    }
  | {
      kind: 'stdout' | 'stderr'
      verbose: boolean
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

export function log(entry: LogEntry) {
  switch (entry.kind) {
    case 'cmd':
      if (!entry.verbose) return
      process.stderr.write(formatCmd(entry.cmd))
      break
    case 'stdout':
    case 'stderr':
      if (!entry.verbose) return
      process.stderr.write(entry.data)
      break
    case 'cd':
      if (!$.verbose) return
      process.stderr.write('$ ' + chalk.greenBright('cd') + ` ${entry.dir}\n`)
      break
    case 'fetch':
      if (!$.verbose) return
      const init = entry.init ? ' ' + inspect(entry.init) : ''
      process.stderr.write(
        '$ ' + chalk.greenBright('fetch') + ` ${entry.url}${init}\n`
      )
      break
    case 'retry':
      if (!$.verbose) return
      process.stderr.write(entry.error + '\n')
  }
}
