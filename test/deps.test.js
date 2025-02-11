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
import { test, describe } from 'node:test'
import { $, tmpfile, tmpdir, fs, path } from '../build/index.js'
import { installDeps, parseDeps } from '../build/deps.js'

const __dirname = new URL('.', import.meta.url).pathname
const root = path.resolve(__dirname, '..')
const cli = path.resolve(root, 'build/cli.js')

describe('deps', () => {
  describe('installDeps()', () => {
    const pkgjson = tmpfile(
      'package.json',
      '{"name": "temp", "version": "0.0.0"}'
    )
    const cwd = path.dirname(pkgjson)
    const t$ = $({ cwd })
    const load = (dep) =>
      fs.readJsonSync(path.join(cwd, 'node_modules', dep, 'package.json'))

    test('loader works via JS API', async () => {
      await installDeps(
        {
          cpy: '9.0.1',
          'lodash-es': '4.17.21',
        },
        cwd
      )
      assert(load('cpy').name === 'cpy')
      assert(load('lodash-es').name === 'lodash-es')
    })

    test('loader works via JS API with custom npm registry URL', async () => {
      await installDeps(
        {
          '@jsr/std__internal': '1.0.5',
        },
        cwd,
        'https://npm.jsr.io'
      )

      assert(load('@jsr/std__internal').name === '@jsr/std__internal')
    })

    test('loader works via CLI', async () => {
      const out =
        await t$`node ${cli} --install <<< 'import _ from "lodash" /* @4.17.15 */; console.log(_.VERSION)'`
      assert.match(out.stdout, /4.17.15/)
    })

    test('loader works via CLI with custom npm registry URL', async () => {
      const code =
        'import { diff } from "@jsr/std__internal";console.log(diff instanceof Function)'
      const file = tmpfile('index.mjs', code)

      let out = await t$`node ${cli} --i --registry=https://npm.jsr.io ${file}`
      fs.remove(file)
      assert.match(out.stdout, /true/)

      out = await t$`node ${cli}  -i --registry=https://npm.jsr.io <<< ${code}`
      assert.match(out.stdout, /true/)
    })
  })

  describe('parseDeps()', () => {
    test('import or require', async () => {
      ;[
        [`import "foo"`, { foo: 'latest' }],
        [`import "foo"`, { foo: 'latest' }],
        [`import * as bar from "foo"`, { foo: 'latest' }],
        [`import('foo')`, { foo: 'latest' }],
        [`require('foo')`, { foo: 'latest' }],
        [`require('foo/bar')`, { foo: 'latest' }],
        [`require('foo/bar.js')`, { foo: 'latest' }],
        [`require('foo-bar')`, { 'foo-bar': 'latest' }],
        [`require('foo_bar')`, { foo_bar: 'latest' }],
        [`require('@foo/bar')`, { '@foo/bar': 'latest' }],
        [`require('@foo/bar/baz')`, { '@foo/bar': 'latest' }],
        [`require('foo.js')`, { 'foo.js': 'latest' }],

        // ignores local deps
        [`import '.'`, {}],
        [`require('.')`, {}],
        [`require('..')`, {}],
        [`require('../foo.js')`, {}],
        [`require('./foo.js')`, {}],

        // ignores invalid pkg names
        [`require('_foo')`, {}],
        [`require('@')`, {}],
        [`require('@/_foo')`, {}],
        [`require('@foo')`, {}],
      ].forEach(([input, result]) => {
        assert.deepEqual(parseDeps(input), result)
      })
    })

    test('import with org and filename', async () => {
      assert.deepEqual(parseDeps(`import "@foo/bar/file"`), {
        '@foo/bar': 'latest',
      })
    })

    test('import with version', async () => {
      assert.deepEqual(parseDeps(`import "foo" // @2.x`), { foo: '2.x' })
      assert.deepEqual(parseDeps(`import "foo" // @^7`), { foo: '^7' })
      assert.deepEqual(parseDeps(`import "foo" /* @1.2.x */`), { foo: '1.2.x' })
    })

    test('multiline', () => {
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
  // import aaa from 'a'
  /* import bbb from 'b' */
  import bar from "bar" /* @1.0.0 */
  import baz from "baz" //    @^2.0
  import qux from "@qux/pkg/entry" //    @^3.0
  import {api as alias} from "qux/entry/index.js" // @^4.0.0-beta.0

  const cpy = await import('cpy')
  const { pick } = require("lodash") //  @4.17.15
  `

      assert.deepEqual(parseDeps(contents), {
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
        '@qux/pkg': '^3.0',
        qux: '^4.0.0-beta.0',
        cpy: 'latest',
        lodash: '4.17.15',
      })
    })
  })
})
