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
import chalk from 'chalk'
import { $, within } from './core.js'
import { sleep } from './goods.js'
import { Duration, parseDuration } from './util.js'

export async function retry<T>(count: number, callback: () => T): Promise<T>
export async function retry<T>(
  count: number,
  duration: Duration | Generator<number>,
  callback: () => T
): Promise<T>
export async function retry<T>(
  count: number,
  a: Duration | Generator<number> | (() => T),
  b?: () => T
): Promise<T> {
  const total = count
  let callback: () => T
  let delayStatic = 0
  let delayGen: Generator<number> | undefined
  if (typeof a == 'function') {
    callback = a
  } else {
    if (typeof a == 'object') {
      delayGen = a
    } else {
      delayStatic = parseDuration(a)
    }
    assert(b)
    callback = b
  }
  let lastErr: unknown
  let attempt = 0
  while (count-- > 0) {
    attempt++
    try {
      return await callback()
    } catch (err) {
      let delay = 0
      if (delayStatic > 0) delay = delayStatic
      if (delayGen) delay = delayGen.next().value
      $.log({
        kind: 'retry',
        error:
          chalk.bgRed.white(' FAIL ') +
          ` Attempt: ${attempt}${total == Infinity ? '' : `/${total}`}` +
          (delay > 0 ? `; next in ${delay}ms` : ''),
      })
      lastErr = err
      if (count == 0) break
      if (delay) await sleep(delay)
    }
  }
  throw lastErr
}

export function* expBackoff(max: Duration = '60s', rand: Duration = '100ms') {
  const maxMs = parseDuration(max)
  const randMs = parseDuration(rand)
  let n = 1
  while (true) {
    const ms = Math.floor(Math.random() * randMs)
    yield Math.min(2 ** n++, maxMs) + ms
  }
}

export async function spinner<T>(callback: () => T): Promise<T>
export async function spinner<T>(title: string, callback: () => T): Promise<T>
export async function spinner<T>(
  title: string | (() => T),
  callback?: () => T
): Promise<T> {
  if (typeof title == 'function') {
    callback = title
    title = ''
  }
  let i = 0
  const spin = () =>
    process.stderr.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  return within(async () => {
    $.verbose = false
    const id = setInterval(spin, 100)
    let result: T
    try {
      result = await callback!()
    } finally {
      clearInterval(id)
      process.stderr.write(' '.repeat(process.stdout.columns - 1) + '\r')
    }
    return result
  })
}
