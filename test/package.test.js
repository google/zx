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

import assert from 'node:assert'
import { test, describe, beforeEach, before, after } from 'node:test'
import '../build/globals.js'

describe('package', () => {
  before(() => syncProcessCwd())
  after(() => syncProcessCwd(false))
  beforeEach(async () => {
    const pack = await $`npm pack`
    await $`tar xf ${pack}`
    await $`rm ${pack}`.nothrow()
  })

  test('ts project', async () => {
    const pack = path.resolve('package')
    const out = await within(async () => {
      cd('test/fixtures/ts-project')
      await $`npm i`
      try {
        await $`npx tsc`
      } catch (err) {
        throw new Error(err.stdout)
      }
      return $`node build/script.js`
    })
    assert.match(out.stderr, /ts-script/)
  })

  test('js project with zx', async () => {
    const pack = path.resolve('package')
    const out = await within(async () => {
      cd('test/fixtures/js-project')
      await $`npm i`
      return $`node node_modules/zx/build/cli.js --verbose script.js`
    })
    assert.match(out.stderr, /js-script/)
  })
})
