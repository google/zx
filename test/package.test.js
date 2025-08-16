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
import { test, describe } from 'node:test'
import { $, within, path, glob, tempdir, fs } from '../build/index.js'

const __dirname = new URL('.', import.meta.url).pathname
const root = path.resolve(__dirname, '..')

describe('package', () => {
  describe('work mode', () => {
    test('ts', async () => {
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

    test('js', async () => {
      const out = await within(async () => {
        $.cwd = path.resolve(__dirname, 'fixtures/js-project')
        await $`npm i --no-package-lock`
        return $`node node_modules/zx/build/cli.js --verbose script.js`
      })
      assert.match(out.stderr, /js-script/)
    })
  })

  describe('contents', () => {
    test('zx full', async () =>
      within(async () => {
        const tmp = tempdir()
        $.cwd = tmp
        $.quiet = true

        // link
        await $`ln -s ${path.resolve(root, 'node_modules')} ${path.resolve(tmp, 'node_modules')}`
        for (const entry of [
          'scripts',
          'build',
          'man',
          'package.json',
          'README.md',
          'LICENSE',
        ]) {
          await fs.copy(path.resolve(root, entry), path.join(tmp, entry))
        }

        // pack / unpack
        await $`node scripts/prepublish-clean.mjs`
        const pack = await $`npm pack`
        await $`tar xf ${pack}`
        await $`rm ${pack}`.nothrow()

        // run
        const { stderr } =
          await $`node -e 'import {$} from "./package/build/core.js"; $.verbose = true; await $\`echo hello\`'`
        assert.match(stderr, /hello/)

        // contents
        const files = await glob('**/*', {
          cwd: path.resolve(tmp, 'package'),
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
            'build/error.d.ts',
            'build/esblib.cjs',
            'build/globals.cjs',
            'build/globals.d.ts',
            'build/globals.js',
            'build/goods.d.ts',
            'build/index.cjs',
            'build/index.d.ts',
            'build/index.js',
            'build/internals.cjs',
            'build/log.d.ts',
            'build/md.d.ts',
            'build/util.cjs',
            'build/util.d.ts',
            'build/versions.d.ts',
            'build/vendor-core.cjs',
            'build/vendor-core.d.ts',
            'build/vendor-extra.cjs',
            'build/vendor-extra.d.ts',
            'build/vendor.cjs',
            'build/vendor.d.ts',
            'build/3rd-party-licenses',
          ].sort()
        )
      }))

    test('zx@lite', async () =>
      within(async () => {
        const tmp = tempdir()
        const unpkg = path.resolve(tmp, 'package')
        $.cwd = tmp
        $.quiet = true

        // link
        await $`ln -s ${path.resolve(root, 'node_modules')} ${path.resolve(tmp, 'node_modules')}`
        for (const entry of [
          'build',
          'package.json',
          'README.md',
          'LICENSE',
          'scripts',
        ]) {
          await fs.copy(path.resolve(root, entry), path.join(tmp, entry))
        }

        // prepare package.json for lite
        await $`node scripts/prepublish-lite.mjs`
        await $`node scripts/prepublish-clean.mjs`

        // pack / unpack
        const pack = await $`npm pack`
        await $`tar xf ${pack}`
        await $`rm ${pack}`.nothrow()

        // run
        const { stderr } =
          await $`node -e 'import {$} from "./package/build/core.js"; $.verbose = true; await $\`echo hello\`'`
        assert.match(stderr, /hello/)

        // contents
        const files = await glob('**/*', {
          cwd: unpkg,
          absolute: false,
          onlyFiles: true,
        })
        assert.deepEqual(
          files.sort(),
          [
            'LICENSE',
            'README.md',
            'build/3rd-party-licenses',
            'build/cli.js',
            'build/core.cjs',
            'build/core.d.ts',
            'build/core.js',
            'build/deno.js',
            'build/error.d.ts',
            'build/esblib.cjs',
            'build/internals.cjs',
            'build/log.d.ts',
            'build/util.cjs',
            'build/util.d.ts',
            'build/vendor-core.cjs',
            'build/vendor-core.d.ts',
            'package.json',
          ].sort()
        )
      }))
  })
})
