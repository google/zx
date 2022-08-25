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

import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { $ } from '../build/index.js'
import { installDeps, parseDeps } from '../build/deps.js'

const test = suite('deps')

$.verbose = false

test('installDeps() loader works via JS API', async () => {
  await installDeps(
    {
      cpy: '9.0.1',
      'lodash-es': '4.17.21',
    },
    { registry: 'https://registry.yarnpkg.com/' }
  )
  assert.instance((await import('cpy')).default, Function)
  assert.instance((await import('lodash-es')).pick, Function)
})

test('installDeps() loader works via CLI', async () => {
  let out =
    await $`node build/cli.js --install --registry="https://registry.yarnpkg.com" <<< 'import lodash from "lodash" /* 4.17.15 */; console.log(lodash.VERSION)'`
  assert.match(out.stdout, '4.17.15')
})

test('parseDeps() extracts deps map', () => {
  const contents = `
  import fs from 'fs'
  import path from 'path'
  import foo from "foo"
  import bar from "bar" /* 1.0.0 */
  import baz from "baz" //    ^2.0

  const cpy = await import('cpy')
  const { pick } = require('lodash')
  `

  assert.equal(parseDeps(contents), {
    foo: 'latest',
    bar: '1.0.0',
    baz: '^2.0',
    cpy: 'latest',
    lodash: 'latest',
  })
})

test.run()
