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

import os from 'node:os'
import path from 'node:path'
import fs, { type Mode } from 'node:fs'
import {
  chalk,
  type RequestInfo,
  type RequestInit,
  type TSpawnStoreChunks,
} from './vendor-core.ts'
import { inspect } from 'node:util'

export { isStringLiteral } from './vendor-core.ts'

export function tempdir(
  prefix: string = `zx-${randomId()}`,
  mode?: Mode
): string {
  const dirpath = path.join(os.tmpdir(), prefix)
  fs.mkdirSync(dirpath, { recursive: true, mode })

  return dirpath
}

export function tempfile(
  name?: string,
  data?: string | Buffer,
  mode?: Mode
): string {
  const filepath = name
    ? path.join(tempdir(), name)
    : path.join(os.tmpdir(), `zx-${randomId()}`)

  if (data === undefined) fs.closeSync(fs.openSync(filepath, 'w', mode))
  else fs.writeFileSync(filepath, data, { mode })

  return filepath
}

export function noop() {}

export function identity<T>(v: T): T {
  return v
}

export function randomId() {
  return Math.random().toString(36).slice(2)
}

export function isString(obj: any) {
  return typeof obj === 'string'
}

const utf8Decoder = new TextDecoder('utf-8')
export const bufToString = (buf: Buffer | string): string =>
  isString(buf) ? buf : utf8Decoder.decode(buf)

export const bufArrJoin = (arr: TSpawnStoreChunks) =>
  arr.reduce((acc, buf) => acc + bufToString(buf), '')

export const getLast = <T>(arr: { length: number; [i: number]: any }): T =>
  arr[arr.length - 1]

const pad = (v: string) => (v === ' ' ? ' ' : '')

export function preferLocalBin(
  env: NodeJS.ProcessEnv,
  ...dirs: (string | undefined)[]
) {
  const pathKey =
    process.platform === 'win32'
      ? Object.keys(env)
          .reverse()
          .find((key) => key.toUpperCase() === 'PATH') || 'Path'
      : 'PATH'
  const pathValue = dirs
    .map(
      (c) =>
        c && [
          path.resolve(c as string, 'node_modules', '.bin'),
          path.resolve(c as string),
        ]
    )
    .flat()
    .concat(env[pathKey])
    .filter(Boolean)
    .join(path.delimiter)

  return {
    ...env,
    [pathKey]: pathValue,
  }
}

// export function normalizeMultilinePieces(
//   pieces: TemplateStringsArray
// ): TemplateStringsArray {
//   return Object.assign(
//     pieces.map((p, i) =>
//       p.trim()
//         ? pad(p[0]) +
//           parseLine(p)
//             .words.map(({ w }) => (w === '\\' ? '' : w.trim()))
//             .join(' ') +
//           pad(p[p.length - 1])
//         : pieces[i]
//     ),
//     { raw: pieces.raw }
//   )
// }

export function quote(arg: string): string {
  if (arg === '') return `$''`
  if (/^[\w/.\-@:=]+$/.test(arg)) return arg

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

export function quotePowerShell(arg: string): string {
  if (arg === '') return `''`
  if (/^[\w/.\-]+$/.test(arg)) return arg

  return `'` + arg.replace(/'/g, "''") + `'`
}

export type Duration = number | `${number}m` | `${number}s` | `${number}ms`

export function parseDuration(d: Duration) {
  if (typeof d === 'number') {
    if (isNaN(d) || d < 0) throw new Error(`Invalid duration: "${d}".`)
    return d
  }
  if (/^\d+s$/.test(d)) return +d.slice(0, -1) * 1000
  if (/^\d+ms$/.test(d)) return +d.slice(0, -2)
  if (/^\d+m$/.test(d)) return +d.slice(0, -1) * 1000 * 60

  throw new Error(`Unknown duration: "${d}".`)
}

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
}
export const log: Log = function (entry) {
  if (!entry.verbose) return
  const stream = process.stderr
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

export const once = <T extends (...args: any[]) => any>(fn: T) => {
  let called = false
  let result: ReturnType<T>
  return (...args: Parameters<T>): ReturnType<T> => {
    if (called) return result
    called = true
    return (result = fn(...args))
  }
}

export const proxyOverride = <T extends object>(
  origin: T,
  ...fallbacks: any
): T =>
  new Proxy(origin, {
    get(target: T, key) {
      return (
        fallbacks.find((f: any) => key in f)?.[key] ??
        Reflect.get(target as T, key)
      )
    },
  }) as T

export const toCamelCase = (str: string) =>
  str.toLowerCase().replace(/([a-z])[_-]+([a-z])/g, (_, p1, p2) => {
    return p1 + p2.toUpperCase()
  })

export const parseBool = (v: string): boolean | string =>
  ({ true: true, false: false })[v] ?? v

export const getLines = (
  chunk: Buffer | string,
  next: (string | undefined)[]
) => {
  const lines = ((next.pop() || '') + bufToString(chunk)).split(/\r?\n/)
  next.push(lines.pop())
  return lines
}
