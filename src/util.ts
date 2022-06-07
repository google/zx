// Copyright 2022 Google LLC
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

import chalk from 'chalk'
import { promisify } from 'node:util'
import psTreeModule from 'ps-tree'
import { ProcessOutput, ProcessPromise } from './core.js'

export const psTree = promisify(psTreeModule)

export function noop() {}

export function randomId() {
  return Math.random().toString(36).slice(2)
}

export function isString(obj: any) {
  return typeof obj === 'string'
}

export function quote(arg: string) {
  if (/^[a-z0-9/_.-]+$/i.test(arg) || arg === '') {
    return arg
  }
  return (
    `$'` +
    arg
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\f/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0') +
    `'`
  )
}

export function substitute(arg: ProcessPromise | any) {
  if (arg?.stdout) {
    return arg.stdout.replace(/\n$/, '')
  }
  return `${arg}`
}

export function stringify(arg: ProcessOutput | any) {
  if (arg instanceof ProcessOutput) {
    return arg.toString().replace(/\n$/, '')
  }
  return `${arg}`
}

export function colorize(cmd: string) {
  return cmd.replace(/^[\w_.-]+(\s|$)/, (substr) => {
    return chalk.greenBright(substr)
  })
}

export function exitCodeInfo(exitCode: number | null): string | undefined {
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
  }[exitCode || -1]
}

export function stdin() {
  try {
    if (process.env.FX_ASYNC_STDIN == 'true') throw 'yes'
    return fs.readFileSync(process.stdin.fd).toString()
  } catch (err) {
    return (async function () {
      let buf = ''
      process.stdin.setEncoding('utf8')
      for await (const chunk of process.stdin) {
        buf += chunk
      }
      return buf
    })()
  }
}

export type Duration = number | `${number}s` | `${number}ms`

export function parseDuration(d: Duration) {
  if (typeof d == 'number') {
    return d
  } else if (/\d+s/.test(d)) {
    return +d.slice(0, -1) * 1000
  } else if (/\d+ms/.test(d)) {
    return +d.slice(0, -2)
  } else {
    throw new Error(`Unknown duration: "${d}".`)
  }
}
