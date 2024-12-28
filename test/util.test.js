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
import fs from 'node:fs'
import { test, describe, after } from 'node:test'
import { fs as fsCore } from '../build/index.js'
import {
  formatCmd,
  isString,
  isStringLiteral,
  noop,
  parseDuration,
  quote,
  quotePowerShell,
  randomId,
  // normalizeMultilinePieces,
  tempdir,
  tempfile,
  preferLocalBin,
  toCamelCase,
} from '../build/util.js'

describe('util', () => {
  test('randomId()', () => {
    assert.ok(/^[a-z0-9]+$/.test(randomId()))
    assert.ok(
      new Set(Array.from({ length: 1000 }).map(() => randomId())).size === 1000
    )
  })

  test('noop()', () => {
    assert.ok(noop() === undefined)
  })

  test('isString()', () => {
    assert.ok(isString('string'))
    assert.ok(!isString(1))
  })

  test('isStringLiteral()', () => {
    const bar = 'baz'
    assert.ok(isStringLiteral``)
    assert.ok(isStringLiteral`foo`)
    assert.ok(isStringLiteral`foo ${bar}`)

    assert.ok(!isStringLiteral(''))
    assert.ok(!isStringLiteral('foo'))
    assert.ok(!isStringLiteral(['foo']))
  })

  test('quote()', () => {
    assert.ok(quote('string') === 'string')
    assert.ok(quote(`'\f\n\r\t\v\0`) === `$'\\'\\f\\n\\r\\t\\v\\0'`)
  })

  test('quotePowerShell()', () => {
    assert.equal(quotePowerShell('string'), 'string')
    assert.equal(quotePowerShell(`'`), `''''`)
  })

  test('duration parsing works', () => {
    assert.equal(parseDuration(1000), 1000)
    assert.equal(parseDuration('2s'), 2000)
    assert.equal(parseDuration('500ms'), 500)
    assert.equal(parseDuration('2m'), 120000)
    assert.throws(() => parseDuration('f2ms'))
    assert.throws(() => parseDuration('2mss'))
    assert.throws(() => parseDuration('100'))
    assert.throws(() => parseDuration(NaN))
    assert.throws(() => parseDuration(-1))
  })

  test('formatCwd works', () => {
    assert.equal(
      formatCmd(`echo $'hi'`),
      "$ \u001b[92mecho\u001b[39m \u001b[93m$\u001b[39m\u001b[93m'hi\u001b[39m\u001b[93m'\u001b[39m\n"
    )
    assert.equal(
      formatCmd(`while true; do "$" done`),
      '$ \u001b[96mwhile\u001b[39m \u001b[92mtrue\u001b[39m\u001b[96m;\u001b[39m \u001b[96mdo\u001b[39m \u001b[93m"$\u001b[39m\u001b[93m"\u001b[39m \u001b[96mdone\u001b[39m\n'
    )
    assert.equal(
      formatCmd(`echo '\n str\n'`),
      "$ \u001b[92mecho\u001b[39m \u001b[93m'\u001b[39m\n> \u001b[93m str\u001b[39m\n> \u001b[93m'\u001b[39m\n"
    )
    assert.equal(
      formatCmd(`$'\\''`),
      "$ \u001b[93m$\u001b[39m\u001b[93m'\u001b[39m\u001b[93m\\\u001b[39m\u001b[93m'\u001b[39m\u001b[93m'\u001b[39m\n"
    )
  })

  // test('normalizeMultilinePieces()', () => {
  //   assert.equal(
  //     normalizeMultilinePieces([' a ', 'b    c    d', ' e']).join(','),
  //     ' a ,b c d, e'
  //   )
  // })

  test('tempdir() creates temporary folders', () => {
    assert.match(tempdir(), /\/zx-/)
    assert.match(tempdir('foo'), /\/foo$/)
  })

  test('tempfile() creates temporary files', () => {
    assert.match(tempfile(), /\/zx-.+/)
    assert.match(tempfile('foo.txt'), /\/zx-.+\/foo\.txt$/)

    const tf = tempfile('bar.txt', 'bar')
    assert.match(tf, /\/zx-.+\/bar\.txt$/)
    assert.equal(fs.readFileSync(tf, 'utf-8'), 'bar')
  })

  test('preferLocalBin()', () => {
    const env = {
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/usr/local/sbin',
    }
    const _env = preferLocalBin(env, process.cwd())
    assert.equal(
      _env.PATH,
      `${process.cwd()}/node_modules/.bin:${process.cwd()}:${env.PATH}`
    )
  })

  test('toCamelCase()', () => {
    assert.equal(toCamelCase('VERBOSE'), 'verbose')
    assert.equal(toCamelCase('PREFER_LOCAL'), 'preferLocal')
    assert.equal(toCamelCase('SOME_MORE_BIG_STR'), 'someMoreBigStr')
    assert.equal(toCamelCase('kebab-input-str'), 'kebabInputStr')
  })
})
