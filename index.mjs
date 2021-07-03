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
  createReadStream,
  createWriteStream,
  existsSync,
  promises as fsPromises,
  constants as fsConstants,
} from 'fs'
import os from 'os'
import {promisify, inspect} from 'util'
import {spawn} from 'child_process'
import {createInterface} from 'readline'
import {default as nodeFetch} from 'node-fetch'
import which from 'which'
import chalk from 'chalk'

export function $(pieces, ...args) {
  let __from = (new Error().stack.split('at ')[2]).trim()
  let cmd = pieces[0], i = 0
  let verbose = $.verbose
  while (i < args.length) {
    let s
    if (Array.isArray(args[i])) {
      s = args[i].map(x => $.quote(substitute(x))).join(' ')
    } else {
      s = $.quote(substitute(args[i]))
    }
    cmd += s + pieces[++i]
  }
  if (verbose) console.log('$', colorize(cmd))
  let options = {
    cwd: $.cwd,
    shell: typeof $.shell === 'string' ? $.shell : true,
    windowsHide: true,
  }
  let child = spawn($.prefix + cmd, options)
  let promise = new ProcessPromise((resolve, reject) => {
    child.on('exit', code => {
      child.on('close', () => {
        let output = new ProcessOutput({
          code, stdout, stderr, combined,
          message: `${stderr || '\n'}    at ${__from}`
        });
        (code === 0 || promise._nothrow ? resolve : reject)(output)
      })
    })
  })
  if (process.stdin.isTTY) {
    process.stdin.pipe(child.stdin)
  }
  let stdout = '', stderr = '', combined = ''
  function onStdout(data) {
    if (verbose) process.stdout.write(data)
    stdout += data
    combined += data
  }
  function onStderr(data) {
    if (verbose) process.stderr.write(data)
    stderr += data
    combined += data
  }
  child.stdout.on('data', onStdout)
  child.stderr.on('data', onStderr)
  promise._stop = () => {
    child.stdout.off('data', onStdout)
    child.stderr.off('data', onStderr)
  }
  promise.child = child
  return promise
}

$.verbose = true
try {
  $.shell = await which('bash')
  $.prefix = 'set -euo pipefail;'
} catch (e) {
  // Bash not found, no prefix.
  $.prefix = ''
}
$.quote = quote
$.cwd = undefined

export function cd(path) {
  if ($.verbose) console.log('$', colorize(`cd ${path}`))
  if (!existsSync(path)) {
    let __from = (new Error().stack.split('at ')[2]).trim()
    console.error(`cd: ${path}: No such directory`)
    console.error(`    at ${__from}`)
    process.exit(1)
  }
  $.cwd = path
}

export const fs = {...fsPromises, constants: fsConstants, createWriteStream, createReadStream}

export async function question(query, options) {
  let completer = undefined
  if (Array.isArray(options?.choices)) {
    completer = function completer(line) {
      const completions = options.choices
      const hits = completions.filter((c) => c.startsWith(line))
      return [hits.length ? hits : completions, line]
    }
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  })
  const question = (q) => new Promise((resolve) => rl.question(q ?? '', resolve))
  let answer = await question(query)
  rl.close()
  return answer
}

export async function fetch(url, init) {
  if ($.verbose) {
    if (typeof init !== 'undefined') {
      console.log('$', colorize(`fetch ${url}`), init)
    } else {
      console.log('$', colorize(`fetch ${url}`))
    }
  }
  return nodeFetch(url, init)
}

export const sleep = promisify(setTimeout)

export function nothrow(promise) {
  promise._nothrow = true
  return promise
}

export class ProcessPromise extends Promise {
  child = undefined
  _stop = () => void 0
  _nothrow = false

  get stdin() {
    return this.child.stdin
  }

  get stdout() {
    return this.child.stdout
  }

  get stderr() {
    return this.child.stderr
  }

  get exitCode() {
    return this
      .then(p => p.exitCode)
      .catch(p => p.exitCode)
  }

  pipe(dest) {
    if (typeof dest === 'string') {
      throw new Error('The pipe() method does not take strings. Forgot $?')
    }
    this._stop()
    if (dest instanceof ProcessPromise) {
      process.stdin.unpipe(dest.stdin)
      this.stdout.pipe(dest.stdin)
      return dest
    }
    this.stdout.pipe(dest)
    return this
  }
}

export class ProcessOutput extends Error {
  #code = 0
  #stdout = ''
  #stderr = ''
  #combined = ''

  constructor({code, stdout, stderr, combined, message}) {
    super(message)
    this.#code = code
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

  [inspect.custom]() {
    let stringify = (s, c) => s.length === 0 ? "''" : c(inspect(s))
    return `ProcessOutput {
  stdout: ${stringify(this.stdout, chalk.green)},
  stderr: ${stringify(this.stderr, chalk.red)},
  exitCode: ${(this.exitCode === 0 ? chalk.green : chalk.red)(this.exitCode)}
}`
  }
}

function colorize(cmd) {
  return cmd.replace(/^\w+(\s|$)/, substr => {
    return chalk.greenBright(substr)
  })
}

function substitute(arg) {
  if (arg instanceof ProcessOutput) {
    return arg.stdout.replace(/\n$/, '')
  }
  return arg.toString()
}

function quote(arg) {
  if (/^[a-z0-9_.-/]+$/i.test(arg)) {
    return arg
  }
  return `$'`
    + arg
      .replaceAll('\\', '\\\\')
      .replaceAll('\'', '\\\'')
      .replaceAll('\b', '\\b')
      .replaceAll('\f', '\\f')
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r')
      .replaceAll('\t', '\\t')
      .replaceAll('\v', '\\v')
      .replaceAll('\u0000', '\\0')
    + `'`
}

Object.assign(global, {
  $,
  cd,
  chalk,
  fetch,
  fs,
  nothrow,
  os,
  question,
  sleep,
})

export {chalk}
