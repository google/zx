// Copyright 2024 Google LLC
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
import { YAML } from '../build/vendor.js'

describe('YAML', () => {
  test('YAML.parse', () => {
    assert.deepEqual(YAML.parse('a: b\n'), { a: 'b' })
  })

  test('YAML.stringify', () => {
    assert.equal(YAML.stringify({ a: 'b' }), 'a: b\n')
  })

  test('exposes YAML extras', () => {
    ;[
      'parseAllDocuments',
      'parseDocument',
      'isAlias',
      'isCollection',
      'isDocument',
      'isMap',
      'isNode',
      'isPair',
      'isScalar',
      'isSeq',
      'Alias',
      'Composer',
      'Document',
      'Schema',
      'YAMLSeq',
      'YAMLMap',
      'YAMLError',
      'YAMLParseError',
      'YAMLWarning',
      'Pair',
      'Scalar',
      'Lexer',
      'LineCounter',
      'Parser',
    ].forEach((k) => assert.ok(k in YAML))
  })
})
