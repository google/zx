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
import { type Buffer } from 'node:buffer'
import process from 'node:process'

export type LogEntry = {
  verbose?: boolean
} & (
  | {
      kind: 'cmd'
      cmd: string
      cwd: string
      id: string
    }
  | {
      kind: 'stdout'
      data: Buffer
      id: string
    }
  | {
      kind: 'stderr'
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
  | {
      kind: 'kill'
      pid: number | `${number}`
      signal: NodeJS.Signals | null
    }
)

type LogFormatters = {
  [key in LogEntry['kind']]: (
    entry: Extract<LogEntry, { kind: key }>
  ) => string | Buffer
}

const formatters: LogFormatters = {
  cmd({ cmd }) {
    return formatCmd(cmd)
  },
  stdout({ data }) {
    return data
  },
  stderr({ data }) {
    return data
  },
  custom({ data }) {
    return data
  },
  fetch(entry) {
    const init = entry.init ? ' ' + inspect(entry.init) : ''
    return `$ ${chalk.greenBright('fetch')} ${entry.url}${init}\n`
  },
  cd(entry) {
    return `$ ${chalk.greenBright('cd')} ${entry.dir}\n`
  },
  retry(entry) {
    const attempt = `Attempt: ${entry.attempt}${entry.total == Infinity ? '' : `/${entry.total}`}`
    const delay = entry.delay > 0 ? `; next in ${entry.delay}ms` : ''

    return `${chalk.bgRed.white(' FAIL ')} ${attempt}${delay}\n`
  },
  end() {
    return ''
  },
  kill() {
    return ''
  },
}

type Log = {
  (entry: LogEntry): void
  formatters?: Partial<LogFormatters>
  output?: NodeJS.WriteStream
}

export const log: Log = function (entry) {
  if (!entry.verbose) return
  const stream = log.output || process.stderr
  const format = (log.formatters?.[entry.kind] || formatters[entry.kind]) as (
    entry: LogEntry
  ) => string | Buffer
  if (!format) return // ignore unknown log entries

  stream.write(format(entry))
}

const SPACE_RE = /\s/
const SYNTAX = '()[]{}<>;:+|&='
const CMD_BREAK = '|&;><'
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

export function formatCmd(cmd: string): string {
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
        if (CMD_BREAK.includes(word)) {
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
