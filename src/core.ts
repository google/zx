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
  ChildProcessByStdio,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioPipe,
} from 'child_process'
import { AsyncLocalStorage } from 'node:async_hooks'
import { Readable, Writable } from 'node:stream'
import { inspect, promisify } from 'node:util'
import { spawn } from 'node:child_process'
import assert from 'node:assert'
import { ChalkInstance } from 'chalk'
import { chalk, which } from './goods.js'
import { printCmd } from './print.js'
import { noop, quote, substitute, psTree, exitCodeInfo } from './util.js'

type Shell = (pieces: TemplateStringsArray, ...args: any[]) => ProcessPromise

type Options = {
  verbose: boolean
  cwd: string
  env: NodeJS.ProcessEnv
  shell: string | boolean
  prefix: string
  quote: typeof quote
  spawn: typeof spawn
}

const storage = new AsyncLocalStorage<Options>()

export const $ = new Proxy<Shell & Options>(
  function (pieces, ...args) {
    let from = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    let resolve: Resolve, reject: Resolve
    let promise = new ProcessPromise((...args) => ([resolve, reject] = args))
    let cmd = pieces[0],
      i = 0
    while (i < args.length) {
      let s
      if (Array.isArray(args[i])) {
        s = args[i].map((x: any) => $.quote(substitute(x))).join(' ')
      } else {
        s = $.quote(substitute(args[i]))
      }
      cmd += s + pieces[++i]
    }
    promise._bind(cmd, $.cwd, from, resolve!, reject!)
    // Make sure all subprocesses are started, if not explicitly by await or then().
    setImmediate(() => promise._run())
    return promise
  } as Shell & Options,
  {
    set(_, key, value) {
      let context = storage.getStore()
      assert(context)
      Reflect.set(context, key, value)
      return true
    },
    get(_, key) {
      let context = storage.getStore()
      assert(context)
      return Reflect.get(context, key)
    },
  }
)

void (function init() {
  storage.enterWith({
    verbose: true,
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    prefix: '',
    quote,
    spawn,
  })
  try {
    $.shell = which.sync('bash')
    $.prefix = 'set -euo pipefail;'
  } catch (err) {
    // ¯\_(ツ)_/¯
  }
})()

type Resolve = (out: ProcessOutput) => void

export class ProcessPromise extends Promise<ProcessOutput> {
  child?: ChildProcessByStdio<Writable, Readable, Readable>
  private _command = ''
  private _cwd = ''
  private _from = ''
  private _resolve: Resolve = noop
  private _reject: Resolve = noop
  _nothrow = false
  _quiet = false
  private _resolved = false
  _piped = false
  _prerun = noop
  _postrun = noop

  _bind(
    cmd: string,
    cwd: string,
    from: string,
    resolve: Resolve,
    reject: Resolve
  ) {
    this._command = cmd
    this._cwd = cwd
    this._from = from
    this._resolve = resolve
    this._reject = reject
  }

  _run() {
    if (this.child) return // The _run() called from two places: then() and setTimeout().
    this._prerun() // In case $1.pipe($2), the $2 returned, and on $2._run() invoke $1._run().

    if ($.verbose && !this._quiet) {
      printCmd(this._command)
    }

    this.child = spawn($.prefix + this._command, {
      cwd: this._cwd,
      shell: typeof $.shell === 'string' ? $.shell : true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: $.env,
    })

    this.child.on('close', (code, signal) => {
      let message = `exit code: ${code}`
      if (code != 0 || signal != null) {
        message = `${stderr || '\n'}    at ${this._from}`
        message += `\n    exit code: ${code}${
          exitCodeInfo(code) ? ' (' + exitCodeInfo(code) + ')' : ''
        }`
        if (signal != null) {
          message += `\n    signal: ${signal}`
        }
      }
      let output = new ProcessOutput({
        code,
        signal,
        stdout,
        stderr,
        combined,
        message,
      })
      if (code === 0 || this._nothrow) {
        this._resolve(output)
      } else {
        this._reject(output)
      }
      this._resolved = true
    })

    let stdout = '',
      stderr = '',
      combined = ''
    let onStdout = (data: any) => {
      if ($.verbose && !this._quiet) process.stdout.write(data)
      stdout += data
      combined += data
    }
    let onStderr = (data: any) => {
      if ($.verbose && !this._quiet) process.stderr.write(data)
      stderr += data
      combined += data
    }

    // If process is piped, don't collect or print output.
    if (!this._piped) this.child.stdout.on('data', onStdout)

    // Stderr should be printed regardless of piping.
    this.child.stderr.on('data', onStderr)

    // In case $1.pipe($2), after both subprocesses are running,
    // we can pipe $1.stdout to $2.stdin.
    this._postrun()
  }

  get stdin(): Writable {
    this._run()
    if (!this.child)
      throw new Error('Access to stdin without creation a subprocess.')
    return this.child.stdin
  }

  get stdout(): Readable {
    this._run()
    if (!this.child)
      throw new Error('Access to stdout without creation a subprocess.')
    return this.child.stdout
  }

  get stderr(): Readable {
    this._run()
    if (!this.child)
      throw new Error('Access to stderr without creation a subprocess.')
    return this.child.stderr
  }

  get exitCode() {
    return this.then(
      (p) => p.exitCode,
      (p) => p.exitCode
    )
  }

  pipe(dest: Writable | ProcessPromise | string) {
    if (typeof dest === 'string') {
      throw new Error('The pipe() method does not take strings. Forgot $?')
    }
    if (this._resolved) {
      if (dest instanceof ProcessPromise) {
        dest.stdin.end()
      }
      throw new Error(
        "The pipe() method shouldn't be called after promise is already resolved!"
      )
    }
    this._piped = true
    if (dest instanceof ProcessPromise) {
      dest._prerun = this._run.bind(this)
      dest._postrun = () => {
        if (!dest.child)
          throw new Error(
            'Access to stdin of pipe destination without creation a subprocess.'
          )
        this.stdout.pipe(dest.child.stdin)
      }
      return dest
    } else {
      this._postrun = () => this.stdout.pipe(dest)
      return this
    }
  }

  async kill(signal = 'SIGTERM') {
    this.catch((_) => _)
    if (!this.child)
      throw new Error('Trying to kill child process without creating one.')
    if (!this.child.pid) throw new Error('Child process pid is undefined.')
    let children = await psTree(this.child.pid)
    for (const p of children) {
      try {
        process.kill(+p.PID, signal)
      } catch (e) {}
    }
    try {
      process.kill(this.child.pid, signal)
    } catch (e) {}
  }
}

export class ProcessOutput extends Error {
  readonly #code: number | null
  readonly #signal: NodeJS.Signals | null
  readonly #stdout: string
  readonly #stderr: string
  readonly #combined: string

  constructor({
    code,
    signal,
    stdout,
    stderr,
    combined,
    message,
  }: {
    code: number | null
    signal: NodeJS.Signals | null
    stdout: string
    stderr: string
    combined: string
    message: string
  }) {
    super(message)
    this.#code = code
    this.#signal = signal
    this.#stdout = stdout
    this.#stderr = stderr
    this.#combined = combined
  }

  toString() {
    return this.#combined
  }

  get stdout() {
    return this.#stdout
  }

  get stderr() {
    return this.#stderr
  }

  get exitCode() {
    return this.#code
  }

  get signal() {
    return this.#signal
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

export function nothrow(promise: ProcessPromise) {
  promise._nothrow = true
  return promise
}

export function quiet(promise: ProcessPromise) {
  promise._quiet = true
  return promise
}

export function within(callback: () => void) {
  let context = storage.getStore()
  assert(context)
  storage.run({ ...context }, callback)
}
