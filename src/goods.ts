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

import { Buffer } from 'node:buffer'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { type Mode } from 'node:fs'
import {
  $,
  within,
  ProcessOutput,
  type ProcessPromise,
  path,
  os,
  Fail,
} from './core.ts'
import {
  type Duration,
  getLast,
  identity,
  isStringLiteral,
  parseBool,
  parseDuration,
  randomId,
  toCamelCase,
} from './util.ts'
import {
  type RequestInfo,
  type RequestInit,
  nodeFetch,
  minimist,
  fs,
} from './vendor.ts'

export { versions } from './versions.ts'

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

export { tempdir as tmpdir, tempfile as tmpfile }

type ArgvOpts = minimist.Opts & { camelCase?: boolean; parseBoolean?: boolean }

export const parseArgv = (
  args: string[] = process.argv.slice(2),
  opts: ArgvOpts = {},
  defs: Record<string, any> = {}
): minimist.ParsedArgs =>
  Object.entries<string>(minimist(args, opts)).reduce<minimist.ParsedArgs>(
    (m, [k, v]) => {
      const kTrans = opts.camelCase ? toCamelCase : identity
      const vTrans = opts.parseBoolean ? parseBool : identity
      const [_k, _v] = k === '--' || k === '_' ? [k, v] : [kTrans(k), vTrans(v)]
      m[_k] = _v
      return m
    },
    defs as minimist.ParsedArgs
  )

export function updateArgv(args?: string[], opts?: ArgvOpts) {
  for (const k in argv) delete argv[k]
  parseArgv(args, opts, argv)
}

export const argv: minimist.ParsedArgs = parseArgv()

export function sleep(duration: Duration): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, parseDuration(duration))
  })
}

const responseToReadable = (response: Response, rs: Readable) => {
  const reader = response.body?.getReader()
  if (!reader) {
    rs.push(null)
    return rs
  }
  rs._read = async () => {
    const result = await reader.read()
    rs.push(result.done ? null : Buffer.from(result.value))
  }
  return rs
}

export function fetch(
  url: RequestInfo,
  init?: RequestInit
): Promise<Response> & {
  pipe: {
    (dest: TemplateStringsArray, ...args: any[]): ProcessPromise
    <D>(dest: D): D
  }
} {
  $.log({ kind: 'fetch', url, init, verbose: !$.quiet && $.verbose })
  const p = nodeFetch(url, init)

  return Object.assign(p, {
    pipe(dest: any, ...args: any[]) {
      const rs = new Readable()
      const _dest = isStringLiteral(dest, ...args)
        ? $({
            halt: true,
            signal: init?.signal as AbortSignal,
          })(dest as TemplateStringsArray, ...args)
        : dest
      p.then(
        (r) => responseToReadable(r, rs).pipe(_dest.run?.()),
        (err) => _dest.abort?.(err)
      )
      return _dest
    },
  })
}

export function echo(...args: any[]): void
export function echo(pieces: TemplateStringsArray, ...args: any[]) {
  const msg = isStringLiteral(pieces, ...args)
    ? args.map((a, i) => pieces[i] + stringify(a)).join('') + getLast(pieces)
    : [pieces, ...args].map(stringify).join(' ')

  console.log(msg)
}

function stringify(arg: any) {
  return arg instanceof ProcessOutput ? arg.toString().trimEnd() : `${arg}`
}

export async function question(
  query?: string,
  {
    choices,
    input = process.stdin,
    output = process.stdout,
  }: {
    choices?: string[]
    input?: NodeJS.ReadStream
    output?: NodeJS.WriteStream
  } = {}
): Promise<string> {
  /* c8 ignore next 5 */
  const completer = Array.isArray(choices)
    ? (line: string) => {
        const hits = choices.filter((c) => c.startsWith(line))
        return [hits.length ? hits : choices, line]
      }
    : undefined
  const rl = createInterface({
    input,
    output,
    terminal: true,
    completer,
  })

  return new Promise((resolve) =>
    rl.question(query ?? '', (answer) => {
      rl.close()
      resolve(answer)
    })
  )
}

export async function stdin(stream: Readable = process.stdin): Promise<string> {
  let buf = ''
  for await (const chunk of stream.setEncoding('utf8')) {
    buf += chunk
  }
  return buf
}

export async function retry<T>(count: number, callback: () => T): Promise<T>
export async function retry<T>(
  count: number,
  duration: Duration | Generator<number>,
  callback: () => T
): Promise<T>
export async function retry<T>(
  count: number,
  d: Duration | Generator<number> | (() => T),
  cb?: () => T
): Promise<T> {
  if (typeof d === 'function') return retry(count, 0, d)
  if (!cb) throw new Fail('Callback is required for retry')

  const total = count
  const gen =
    typeof d === 'object'
      ? d
      : (function* (d) {
          while (true) yield d
        })(parseDuration(d))

  let attempt = 0
  let lastErr: unknown
  while (count-- > 0) {
    attempt++
    try {
      return await cb()
    } catch (err) {
      lastErr = err
      const delay = gen.next().value

      $.log({
        kind: 'retry',
        total,
        attempt,
        delay,
        exception: err,
        verbose: !$.quiet && $.verbose,
        error: `FAIL Attempt: ${attempt}/${total}, next: ${delay}`, // legacy
      })
      if (delay > 0) await sleep(delay)
    }
  }
  throw lastErr
}

export function* expBackoff(
  max: Duration = '60s',
  delay: Duration = '100ms'
): Generator<number, void, unknown> {
  const maxMs = parseDuration(max)
  const randMs = parseDuration(delay)
  let n = 0
  while (true) {
    yield Math.min(randMs * 2 ** n++, maxMs)
  }
}

export async function spinner<T>(callback: () => T): Promise<T>
export async function spinner<T>(title: string, callback: () => T): Promise<T>
export async function spinner<T>(
  title: string | (() => T),
  callback?: () => T
): Promise<T> {
  if (typeof title === 'function') return spinner('', title)
  if ($.quiet || process.env.CI) return callback!()

  let i = 0
  const stream = $.log.output || process.stderr
  const spin = () => stream.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  return within(async () => {
    $.verbose = false
    const id = setInterval(spin, 100)

    try {
      return await callback!()
    } finally {
      clearInterval(id as ReturnType<typeof setTimeout>)
      stream.write(' '.repeat((process.stdout.columns || 1) - 1) + '\r')
    }
  })
}
