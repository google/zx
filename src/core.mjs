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

import {inspect} from 'node:util'
import {spawn} from 'node:child_process'
import {
  chalk,
  psTree,
  which,
} from './goods.mjs'
import {als, boundCtx, getCtx} from './als.mjs'
import {randId} from './util.mjs'
import {printStd, printCmd} from './print.mjs'
import {formatCmd, quote} from './guards.mjs'

export function $(...args) {
  let resolve, reject
  let promise = new ProcessPromise((...args) => [resolve, reject] = args)

  promise[boundCtx] = {
    ...getCtx(),
    id:      randId(),
    cwd:     process.cwd(),
    cmd:     formatCmd(...args),
    __from:   (new Error().stack.split(/^\s*at\s/m)[2]).trim(),
    resolve,
    reject
  }

  setImmediate(() => promise._run()) // Make sure all subprocesses are started, if not explicitly by await or then().

  return promise
}

als.enterWith($)

$.quote = quote
$.spawn = spawn
$.verbose = true
$.maxBuffer = 200 * 1024 * 1024 /* 200 MiB*/
$.prefix = '' // Bash not found, no prefix.
try {
  $.shell = which.sync('bash')
  $.prefix = 'set -euo pipefail;'
} catch (e) {
}

export class ProcessPromise extends Promise {
  child = undefined
  _resolved = false
  _inheritStdin = true
  _piped = false
  _prerun = undefined
  _postrun = undefined

  get stdin() {
    this._inheritStdin = false
    this._run()
    return this.child.stdin
  }

  get stdout() {
    this._inheritStdin = false
    this._run()
    return this.child.stdout
  }

  get stderr() {
    this._inheritStdin = false
    this._run()
    return this.child.stderr
  }

  get exitCode() {
    return this
      .then(p => p.exitCode, p => p.exitCode)
  }

  pipe(dest) {
    if (typeof dest === 'string') {
      throw new Error('The pipe() method does not take strings. Forgot $?')
    }
    if (this._resolved === true) {
      throw new Error('The pipe() method shouldn\'t be called after promise is already resolved!')
    }
    this._piped = true
    if (dest instanceof ProcessPromise) {
      dest._inheritStdin = false
      dest._prerun = this._run.bind(this)
      dest._postrun = () => this.stdout.pipe(dest.child.stdin)
      return dest
    } else {
      this._postrun = () => this.stdout.pipe(dest)
      return this
    }
  }

  async kill(signal = 'SIGTERM') {
    this.catch(_ => _)
    let children = await psTree(this.child.pid)
    for (const p of children) {
      try {
        process.kill(p.PID, signal)
      } catch (e) {
      }
    }
    try {
      process.kill(this.child.pid, signal)
    } catch (e) {
    }
  }

  _run() {
    if (this.child) return // The _run() called from two places: then() and setTimeout().
    if (this._prerun) this._prerun() // In case $1.pipe($2), the $2 returned, and on $2._run() invoke $1._run().

    const ctx = this[boundCtx]
    als.run(ctx, () => {
      const {
        nothrow,
        cmd,
        cwd,
        prefix,
        shell,
        maxBuffer,
        __from,
        resolve,
        reject
      } = ctx

      printCmd(cmd)

      let child = spawn(prefix + cmd, {
        cwd,
        shell: typeof shell === 'string' ? shell : true,
        stdio: [this._inheritStdin ? 'inherit' : 'pipe', 'pipe', 'pipe'],
        windowsHide: true,
        maxBuffer,
      })

      child.on('close', (code, signal) => {

        let message = `${stderr || '\n'}    at ${__from}`
        message += `\n    exit code: ${code}${exitCodeInfo(code) ? ' (' + exitCodeInfo(code) + ')' : ''}`
        if (signal !== null) {
          message += `\n    signal: ${signal}`
        }
        let output = new ProcessOutput({
          code,
          signal,
          stdout,
          stderr,
          combined,
          message,
        });
        (code === 0 || nothrow ? resolve : reject)(output)
        this._resolved = true
      })

      let stdout = '', stderr = '', combined = ''
      let onStdout = data => {
        printStd(data)
        stdout += data
        combined += data
      }
      let onStderr = data => {
        printStd(null, data)
        stderr += data
        combined += data
      }
      if (!this._piped) child.stdout.on('data', onStdout) // If process is piped, don't collect or print output.
      child.stderr.on('data', onStderr) // Stderr should be printed regardless of piping.
      this.child = child
      if (this._postrun) this._postrun() // In case $1.pipe($2), after both subprocesses are running, we can pipe $1.stdout to $2.stdin.
    })
  }
}

export class ProcessOutput extends Error {
  #code = null
  #signal = null
  #stdout = ''
  #stderr = ''
  #combined = ''

  constructor({code, signal, stdout, stderr, combined, message}) {
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
    let stringify = (s, c) => s.length === 0 ? '\'\'' : c(inspect(s))
    return `ProcessOutput {
  stdout: ${stringify(this.stdout, chalk.green)},
  stderr: ${stringify(this.stderr, chalk.red)},
  signal: ${inspect(this.signal)},
  exitCode: ${(this.exitCode === 0 ? chalk.green : chalk.red)(this.exitCode)}${(exitCodeInfo(this.exitCode) ? chalk.grey(' (' + exitCodeInfo(this.exitCode) + ')') : '')}
}`
  }
}

function exitCodeInfo(exitCode) {
  return {
    2: 'Misuse of shell builtins',
    126: 'Invoked command cannot execute',
    127: 'Command not found',
    128: 'Invalid exit argument',
    129: 'Hangup',
    130: 'Interrupt',
    131: 'Quit and dump core',
    132: 'Illegal instruction',
    133: 'Trace/breakpoint trap',
    134: 'Process aborted',
    135: 'Bus error: "access to undefined portion of memory object"',
    136: 'Floating point exception: "erroneous arithmetic operation"',
    137: 'Kill (terminate immediately)',
    138: 'User-defined 1',
    139: 'Segmentation violation',
    140: 'User-defined 2',
    141: 'Write to pipe with no one reading',
    142: 'Signal raised by alarm',
    143: 'Termination (request to terminate)',
    145: 'Child process terminated, stopped (or continued*)',
    146: 'Continue if stopped',
    147: 'Stop executing temporarily',
    148: 'Terminal stop signal',
    149: 'Background process attempting to read from tty ("in")',
    150: 'Background process attempting to write to tty ("out")',
    151: 'Urgent data available on socket',
    152: 'CPU time limit exceeded',
    153: 'File size limit exceeded',
    154: 'Signal raised by timer counting virtual time: "virtual timer expired"',
    155: 'Profiling timer expired',
    157: 'Pollable event',
    159: 'Bad syscall',
  }[exitCode]
}
