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
  MAML,
  minimist,
  which,
  glob,
  nodeFetch as fetch,
} from '../build/vendor.cjs'

describe('vendor API', () => {
  describe('YAML', () => {
    test('parse()', () => {
      assert.deepEqual(YAML.parse('a: b\n'), { a: 'b' })
    })
    test('stringify()', () => {
      assert.equal(YAML.stringify({ a: 'b' }), 'a: b\n')
    })
  })

  describe('MAML', () => {
    test('parse()/stringify()', () => {
      const maml = `{
  project: "MAML"
  tags: [
    "minimal"
    "readable"
  ]
  spec: {
    version: 1
    author: "Anton Medvedev"
  }
  notes: """
This is a multiline string.
Keeps formatting as‑is.
"""
}`
      const obj = MAML.parse(maml)

      assert.deepEqual(MAML.parse(MAML.stringify(obj)), obj)
      assert.deepEqual(obj, {
        project: 'MAML',
        tags: ['minimal', 'readable'],
        spec: {
          version: 1,
          author: 'Anton Medvedev',
        },
        notes: 'This is a multiline string.\nKeeps formatting as‑is.\n',
      })
    })
  })

  test('globby() works', async () => {
    assert.deepEqual(await glob('*.md'), ['README.md'])
    assert.deepEqual(glob.sync('*.md'), ['README.md'])
  })

  test('fetch() works', async () => {
    assert.match(
      await fetch('https://github.com').then((res) => res.text()),
      /GitHub/
    )
  })

  test('which() available', async () => {
    assert.equal(which.sync('npm'), await which('npm'))
    assert.throws(() => which.sync('not-found-cmd'), /not-found-cmd/)
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
