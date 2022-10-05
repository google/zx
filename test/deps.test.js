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
  await installDeps({
    cpy: '9.0.1',
    'lodash-es': '4.17.21',
  })
  assert.instance((await import('cpy')).default, Function)
  assert.instance((await import('lodash-es')).pick, Function)
})

test('installDeps() loader works via CLI', async () => {
  let out =
    await $`node build/cli.js --install <<< 'import _ from "lodash" /* @4.17.15 */; console.log(_.VERSION)'`
  assert.match(out.stdout, '4.17.15')
})

test('parseDeps(): import or require', async () => {
  assert.equal(parseDeps(`import "foo"`), { foo: 'latest' })
  assert.equal(parseDeps(`import * as bar from "foo"`), { foo: 'latest' })
  assert.equal(parseDeps(`import('foo')`), { foo: 'latest' })
  assert.equal(parseDeps(`require('foo')`), { foo: 'latest' })
})

test('parseDeps(): import with org and filename', async () => {
  assert.equal(parseDeps(`import "@foo/bar/file"`), { '@foo/bar': 'latest' })
})

test('parseDeps(): import with version', async () => {
  assert.equal(parseDeps(`import "foo" // @2.x`), { foo: '2.x' })
  assert.equal(parseDeps(`import "foo" // @^7`), { foo: '^7' })
  assert.equal(parseDeps(`import "foo" /* @1.2.x */`), { foo: '1.2.x' })
})

test('parseDeps(): multiline', () => {
  const contents = `
  require('a') // @1.0.0
  const b =require('b') /* @2.0.0 */
  const c = {
    c:require('c') /* @3.0.0 */, 
    d: await import('d') /* @4.0.0 */, 
    ...require('e') /* @5.0.0 */
  }
  const f = [...require('f') /* @6.0.0 */] 
  ;require('g'); // @7.0.0
  const h = 1 *require('h') // @8.0.0
  {require('i') /* @9.0.0 */}
  import 'j' // @10.0.0

  import fs from 'fs'
  import path from 'path'
  import foo from "foo"
  import bar from "bar" /* @1.0.0 */
  import baz from "baz" //    @^2.0

  const cpy = await import('cpy')
  const { pick } = require("lodash") //  @4.17.15
  `

  assert.equal(parseDeps(contents), {
    a: '1.0.0',
    b: '2.0.0',
    c: '3.0.0',
    d: '4.0.0',
    e: '5.0.0',
    f: '6.0.0',
    g: '7.0.0',
    h: '8.0.0',
    i: '9.0.0',
    j: '10.0.0',
    foo: 'latest',
    bar: '1.0.0',
    baz: '^2.0',
    cpy: 'latest',
    lodash: '4.17.15',
  })
})

test.run()
