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
import {
  exitCodeInfo,
  randomId,
  noop,
  isString,
  quote,
  parseDuration,
} from '../build/util.js'

const test = suite('util')

test('exitCodeInfo()', () => {
  assert.ok(exitCodeInfo(2) === 'Misuse of shell builtins')
})

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
  assert.not.ok(isString(1))
})

test('quote()', () => {
  assert.ok(quote('string') === 'string')
  assert.ok(quote(`'\f\n\r\t\v\0`) === `$'\\'\\f\\n\\r\\t\\v\\0'`)
})

test('duration parsing works', () => {
  assert.is(parseDuration(1000), 1000)
  assert.is(parseDuration('2s'), 2000)
  assert.is(parseDuration('500ms'), 500)
  assert.throws(() => parseDuration('100'))
})

test.run()
