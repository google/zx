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

import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

const test = suite('experimental')

$.verbose = false

function zx(script) {
  return $`node build/cli.js --experimental --eval ${script}`
}

test('retry works', async () => {
  const now = Date.now()
  let p = await zx(`
    try {
      await retry(5, 50, () => $\`exit 123\`)
    } catch (e) {
      echo('exitCode:', e.exitCode)
    }
    await retry(5, () => $\`exit 0\`)
    echo('success')
`)
  assert.match(p.toString(), 'exitCode: 123')
  assert.match(p.toString(), 'success')
  assert.ok(Date.now() >= now + 50 * (5 - 1))
})

test('spinner works', async () => {
  let out = await zx(`
    let stop = startSpinner('waiting')
    await sleep(1000)
    stop()
  `)
  assert.match(out.stderr, 'waiting')
})

test.run()
