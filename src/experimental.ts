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

import { $ } from './core.js'
import { sleep } from './goods.js'

// Retries a command a few times. Will return after the first
// successful attempt, or will throw after specifies attempts count.
export function retry(count = 5, delay = 0) {
  return async function (cmd: TemplateStringsArray, ...args: any[]) {
    while (count-- > 0)
      try {
        return await $(cmd, ...args)
      } catch (p) {
        if (count === 0) throw p
        if (delay) await sleep(delay)
      }
    return
  }
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
