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
import '../build/globals.js'
import * as index from '../build/index.js'

const test = suite('global')

function zx(script) {
  return $`node build/cli.js --eval ${script}`.nothrow().timeout('5s')
}

test('global cd()', async () => {
  const cwd = (await $`pwd`).toString().trim()
  cd('/')
  assert.is((await $`pwd`).toString().trim(), path.resolve('/'))
  cd(cwd)
  assert.is((await $`pwd`).toString().trim(), cwd)
})

test('injects zx index to global', () => {
  for (let [key, value] of Object.entries(index)) {
    assert.is(global[key], value)
  }
})

test('chalk available with no import', async () => {
  let p = await zx("console.log(`Hello ${chalk.bold('World')}`)")
  assert.is(p.stdout, 'Hello \x1B[1mWorld\x1B[22m\n')
})

test('chalk-template available with no import', async () => {
  let p = await zx('console.log(chalkTemplate`Hello {bold World}`)')
  assert.is(p.stdout, 'Hello \x1B[1mWorld\x1B[22m\n')
})

test('echo supports chalk-template', async () => {
  let p = await zx('echo`Hello {bold World}`')
  assert.is(p.stdout, 'Hello \x1B[1mWorld\x1B[22m\n')
})

test('echo supports chalk-template and ProcessPromise', async () => {
  let p = await zx('const e = $`echo World`; echo`Hello {bold ${await e}}`')
  assert.is(p.stdout, 'Hello \x1B[1mWorld\x1B[22m\n')
})

test.run()
