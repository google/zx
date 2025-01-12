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
import {
  YAML,
  minimist,
  which,
  glob,
  nodeFetch as fetch,
} from '../build/vendor.js'

describe('vendor API', () => {
  test('YAML.parse', () => {
    assert.deepEqual(YAML.parse('a: b\n'), { a: 'b' })
  })

  test('YAML.stringify', () => {
    assert.equal(YAML.stringify({ a: 'b' }), 'a: b\n')
  })

  test('globby() works', async () => {
    assert.deepEqual(await glob('*.md'), ['README.md'])
  })

  test('fetch() works', async () => {
    assert.match(
      await fetch('https://example.com').then((res) => res.text()),
      /Example Domain/
    )
  })

  test('which() available', async () => {
    assert.equal(which.sync('npm'), await which('npm'))
  })

  test('minimist available', async () => {
    assert.equal(typeof minimist, 'function')
  })

  test('minimist works', async () => {
    assert.deepEqual(
      minimist(
        ['--foo', 'bar', '-a', '5', '-a', '42', '--force', './some.file'],
        { boolean: 'force' }
      ),
      {
        a: [5, 42],
        foo: 'bar',
        force: true,
        _: ['./some.file'],
      }
    )
  })
})
