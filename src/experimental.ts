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
import { $ } from './core.js'
import { sleep } from './goods.js'
import { Duration, parseDuration } from './util.js'

export async function retry<T>(count: number, callback: () => T): Promise<T>
export async function retry<T>(
  count: number,
  duration: Duration,
  callback?: () => T
): Promise<T>
export async function retry<T>(
  count: number,
  a: Duration | (() => T),
  b?: () => T
): Promise<T> {
  const total = count
  let cb: () => T
  let delay = 0
  if (typeof a == 'function') {
    cb = a
  } else {
    delay = parseDuration(a)
    assert(b)
    cb = b
  }
  while (count-- > 0) {
    try {
      return await cb()
    } catch (err) {
      if ($.verbose) {
        console.error(
          chalk.bgRed.white(' FAIL '),
          `Attempt: ${total - count}/${total}` +
            (delay > 0 ? `; next in ${delay}ms` : '')
        )
      }
      if (count == 0) throw err
      if (delay) await sleep(delay)
    }
  }
  throw 'unreachable'
}

/**
 * Starts a simple CLI spinner.
 * @param title Spinner's title.
 * @return A stop() func.
 */
export function startSpinner(title = '') {
  let i = 0,
    v = $.verbose
  $.verbose = false
  let spin = () =>
    process.stderr.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  let id = setInterval(spin, 100)
  return () => {
    clearInterval(id)
    $.verbose = v
  }
}
