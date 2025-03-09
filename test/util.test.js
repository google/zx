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
import { test, describe } from 'node:test'
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
    assert.ok(quote('') === `$''`)
    assert.ok(quote(`'\f\n\r\t\v\0`) === `$'\\'\\f\\n\\r\\t\\v\\0'`)
  })

  test('quotePowerShell()', () => {
    assert.equal(quotePowerShell('string'), 'string')
    assert.equal(quotePowerShell(`'`), `''''`)
    assert.equal(quotePowerShell(''), `''`)
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
    const cases = [
      [
        `echo $'hi'`,
        "$ \x1B[92mecho\x1B[39m \x1B[93m$\x1B[39m\x1B[93m'hi'\x1B[39m\n",
      ],
      [`echo$foo`, '$ \x1B[92mecho\x1B[39m\x1B[93m$\x1B[39mfoo\n'],
      [
        `test --foo=bar p1 p2`,
        '$ \x1B[92mtest\x1B[39m --foo\x1B[31m=\x1B[39mbar p1 p2\n',
      ],
      [
        `cmd1 --foo || cmd2`,
        '$ \x1B[92mcmd1\x1B[39m --foo \x1B[31m|\x1B[39m\x1B[31m|\x1B[39m\x1B[92m cmd2\x1B[39m\n',
      ],
      [
        `A=B C='D' cmd`,
        "$ A\x1B[31m=\x1B[39mB C\x1B[31m=\x1B[39m\x1B[93m'D'\x1B[39m\x1B[92m cmd\x1B[39m\n",
      ],
      [
        `foo-extra --baz = b-a-z --bar = 'b-a-r' -q -u x`,
        "$ \x1B[92mfoo-extra\x1B[39m --baz \x1B[31m=\x1B[39m b-a-z --bar \x1B[31m=\x1B[39m \x1B[93m'b-a-r'\x1B[39m -q -u x\n",
      ],
      [
        `while true; do "$" done`,
        '$ \x1B[96mwhile\x1B[39m true\x1B[31m;\x1B[39m\x1B[96m do\x1B[39m \x1B[93m"$"\x1B[39m\x1B[96m done\x1B[39m\n',
      ],
      [
        `echo '\n str\n'`,
        "$ \x1B[92mecho\x1B[39m \x1B[93m'\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[93m str\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[93m'\x1B[39m\n",
      ],
      [`$'\\''`, "$ \x1B[93m$\x1B[39m\x1B[93m'\\'\x1B[39m\x1B[93m'\x1B[39m\n"],
      [
        'sass-compiler --style=compressed src/static/bootstrap.scss > dist/static/bootstrap-v5.3.3.min.css',
        '$ \x1B[92msass-compiler\x1B[39m --style\x1B[31m=\x1B[39mcompressed src/static/bootstrap.scss \x1B[31m>\x1B[39m\x1B[92m dist/static/bootstrap-v5.3.3.min.css\x1B[39m\n',
      ],
      [
        'echo 1+2 | bc',
        '$ \x1B[92mecho\x1B[39m 1\x1B[31m+\x1B[39m2 \x1B[31m|\x1B[39m\x1B[92m bc\x1B[39m\n',
      ],
      [
        'echo test &>> filepath',
        '$ \x1B[92mecho\x1B[39m test \x1B[31m&\x1B[39m\x1B[31m>\x1B[39m\x1B[31m>\x1B[39m\x1B[92m filepath\x1B[39m\n',
      ],
      [
        'bc < filepath',
        '$ \x1B[92mbc\x1B[39m \x1B[31m<\x1B[39m\x1B[92m filepath\x1B[39m\n',
      ],
      [
        `cat << 'EOF' | tee -a filepath
line 1
line 2
EOF`,
        "$ \x1B[92mcat\x1B[39m \x1B[31m<\x1B[39m\x1B[31m<\x1B[39m \x1B[93m'EOF'\x1B[39m \x1B[31m|\x1B[39m\x1B[92m tee\x1B[39m -a filepath\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0mline 1\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0mline 2\x1B[96m\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[96mEOF\x1B[39m\n",
      ],
    ]

    cases.forEach(([input, expected]) => {
      assert.equal(formatCmd(input), expected, input)
    })
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
