// Copyright 2025 Google LLC
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

import { chalk, type RequestInfo, type RequestInit } from './vendor-core.ts'
import { inspect } from 'node:util'

export type LogEntry = {
  verbose?: boolean
} & (
  | {
      kind: 'cmd'
      cmd: string
      id: string
    }
  | {
      kind: 'stdout' | 'stderr'
      data: Buffer
      id: string
    }
  | {
      kind: 'end'
      exitCode: number | null
      signal: NodeJS.Signals | null
      duration: number
      error: null | Error
      id: string
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
      attempt: number
      total: number
      delay: number
      exception: unknown
      error?: string
    }
  | {
      kind: 'custom'
      data: any
    }
)

type LogFormatter = (cmd?: string) => string
type Log = {
  (entry: LogEntry): void
  formatCmd?: LogFormatter
  output?: NodeJS.WriteStream
}
export const log: Log = function (entry) {
  if (!entry.verbose) return
  const stream = log.output || process.stderr
  switch (entry.kind) {
    case 'cmd':
      stream.write((log.formatCmd || formatCmd)(entry.cmd))
      break
    case 'stdout':
    case 'stderr':
    case 'custom':
      stream.write(entry.data)
      break
    case 'cd':
      stream.write('$ ' + chalk.greenBright('cd') + ` ${entry.dir}\n`)
      break
    case 'fetch':
      const init = entry.init ? ' ' + inspect(entry.init) : ''
      stream.write('$ ' + chalk.greenBright('fetch') + ` ${entry.url}${init}\n`)
      break
    case 'retry':
      stream.write(
        chalk.bgRed.white(' FAIL ') +
          ` Attempt: ${entry.attempt}${entry.total == Infinity ? '' : `/${entry.total}`}` +
          (entry.delay > 0 ? `; next in ${entry.delay}ms` : '') +
          '\n'
      )
  }
}

const SYNTAX = '()[]{}<>;:+|&='
const CMD_BREAK = new Set(['|', '&', ';', '>', '<'])
const SPACE_RE = /\s/
const RESERVED_WORDS = new Set([
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
  'EOF',
])

export const formatCmd: LogFormatter = function (cmd) {
  if (cmd == undefined) return chalk.grey('undefined')
  let q = ''
  let out = '$ '
  let buf = ''
  let mode: 'syntax' | 'quote' | 'dollar' | '' = ''
  let pos = 0
  const cap = () => {
    const word = buf.trim()
    if (word) {
      pos++
      if (mode === 'syntax') {
        if (CMD_BREAK.has(word)) {
          pos = 0
        }
        out += chalk.red(buf)
      } else if (mode === 'quote' || mode === 'dollar') {
        out += chalk.yellowBright(buf)
      } else if (RESERVED_WORDS.has(word)) {
        out += chalk.cyanBright(buf)
      } else if (pos === 1) {
        out += chalk.greenBright(buf)
        pos = Infinity
      } else {
        out += buf
      }
    } else {
      out += buf
    }
    mode = ''
    buf = ''
  }

  for (const c of [...cmd]) {
    if (!q) {
      if (c === '$') {
        cap()
        mode = 'dollar'
        buf += c
        cap()
      } else if (c === "'" || c === '"') {
        cap()
        mode = 'quote'
        q = c
        buf += c
      } else if (SPACE_RE.test(c)) {
        cap()
        buf += c
      } else if (SYNTAX.includes(c)) {
        const isEnv = c === '=' && pos === 0
        isEnv && (pos = 1)
        cap()
        mode = 'syntax'
        buf += c
        cap()
        isEnv && (pos = -1)
      } else {
        buf += c
      }
    } else {
      buf += c
      if (c === q) {
        cap()
        q = ''
      }
    }
  }
  cap()
  return out.replaceAll('\n', chalk.reset('\n> ')) + '\n'
}
