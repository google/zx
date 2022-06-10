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

import chalk, { ChalkInstance } from 'chalk'
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

export async function stdin() {
  let buf = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) {
    buf += chunk
  }
  return buf
}

export type Duration = number | `${number}s` | `${number}ms`

export function parseDuration(d: Duration) {
  if (typeof d == 'number') {
    if (isNaN(d) || d < 0) {
      throw new Error(`Invalid duration: "${d}".`)
    }
    return d
  } else if (/\d+s/.test(d)) {
    return +d.slice(0, -1) * 1000
  } else if (/\d+ms/.test(d)) {
    return +d.slice(0, -2)
  }

  throw new Error(`Unknown duration: "${d}".`)
}

export function formatCmd(cmd?: string): string {
  if (cmd == undefined) return chalk.grey('undefined')
  const chars = [...cmd]
  let out = '$ '
  let buf = ''
  let ch: string
  type State = (() => State) | undefined
  let state: State = root
  let wordCount = 0
  while (state) {
    ch = chars.shift() || 'EOF'
    if (ch == '\n') {
      out += style(state, buf) + '\n> '
      buf = ''
      continue
    }
    const next: State = ch == 'EOF' ? undefined : state()
    if (next != state) {
      out += style(state, buf)
      buf = ''
    }
    state = next == root ? next() : next
    buf += ch
  }
  function style(state: State, s: string): string {
    if (s == '') return ''
    if (reservedWords.includes(s)) {
      return chalk.cyanBright(s)
    }
    if (state == word && wordCount == 0) {
      wordCount++
      return chalk.greenBright(s)
    }
    if (state == syntax) {
      wordCount = 0
      return chalk.cyanBright(s)
    }
    if (state == dollar) return chalk.yellowBright(s)
    if (state?.name.startsWith('str')) return chalk.yellowBright(s)
    return s
  }
  function isSyntax(ch: string) {
    return '()[]{}<>;:+|='.includes(ch)
  }
  function root() {
    if (/\s/.test(ch)) return space
    if (isSyntax(ch)) return syntax
    if (/[$]/.test(ch)) return dollar
    if (/["]/.test(ch)) return strDouble
    if (/[']/.test(ch)) return strSingle
    return word
  }
  function space() {
    if (/\s/.test(ch)) return space
    return root
  }
  function word() {
    if (/[0-9a-z/_.]/i.test(ch)) return word
    return root
  }
  function syntax() {
    if (isSyntax(ch)) return syntax
    return root
  }
  function dollar() {
    if (/[']/.test(ch)) return str
    return root
  }
  function str() {
    if (/[']/.test(ch)) return strEnd
    if (/[\\]/.test(ch)) return strBackslash
    return str
  }
  function strBackslash() {
    return strEscape
  }
  function strEscape() {
    return str
  }
  function strDouble() {
    if (/["]/.test(ch)) return strEnd
    return strDouble
  }
  function strSingle() {
    if (/[']/.test(ch)) return strEnd
    return strSingle
  }
  function strEnd() {
    return root
  }
  return out + '\n'
}

const reservedWords = [
  'if',
  'then',
  'else',
  'elif',
  'fi',
  'case',
  'esac',
  'for',
  'select',
  'while',
  'until',
  'do',
  'done',
  'in',
]
