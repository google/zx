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
import { test, describe, after, before } from 'node:test'
import { $, within, path, glob } from '../build/index.js'

const __dirname = new URL('.', import.meta.url).pathname
const root = path.resolve(__dirname, '..')

describe('package', () => {
  before(async () => {
    const pack = await $`npm pack`
    await $`tar xf ${pack}`
    await $`rm ${pack}`.nothrow()
  })
  after(async () => {
    await $`rm -rf package`
  })

  test('content looks fine', async () => {
    const files = await glob('**/*', {
      cwd: path.resolve(root, 'package'),
      absolute: false,
      onlyFiles: true,
    })
    assert.deepEqual(
      files.sort(),
      [
        'LICENSE',
        'README.md',
        'package.json',
        'man/zx.1',
        'build/cli.cjs',
        'build/cli.d.ts',
        'build/cli.js',
        'build/core.cjs',
        'build/core.d.ts',
        'build/core.js',
        'build/deno.js',
        'build/deps.cjs',
        'build/deps.d.ts',
        'build/deps.js',
        'build/esblib.cjs',
        'build/globals.cjs',
        'build/globals.d.ts',
        'build/globals.js',
        'build/goods.cjs',
        'build/goods.d.ts',
        'build/goods.js',
        'build/index.cjs',
        'build/index.d.ts',
        'build/index.js',
        'build/util.cjs',
        'build/util.d.ts',
        'build/util.js',
        'build/vendor-core.cjs',
        'build/vendor-core.d.ts',
        'build/vendor-core.js',
        'build/vendor-extra.cjs',
        'build/vendor-extra.d.ts',
        'build/vendor-extra.js',
        'build/vendor.cjs',
        'build/vendor.d.ts',
        'build/vendor.js',
      ].sort()
    )
  })

  test('ts project', async () => {
    const out = await within(async () => {
      $.cwd = path.resolve(__dirname, 'fixtures/ts-project')
      await $`npm i --no-package-lock`
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
    const out = await within(async () => {
      $.cwd = path.resolve(__dirname, 'fixtures/js-project')
      await $`npm i --no-package-lock`
      return $`node node_modules/zx/build/cli.js --verbose script.js`
    })
    assert.match(out.stderr, /js-script/)
  })
})
