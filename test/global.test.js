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
import { test, describe, after } from 'node:test'
import '../build/globals.js'
import * as index from '../build/index.js'

describe('global', () => {
  after(() => {
    for (const key of Object.keys(index)) {
      delete global[key]
    }
  })

  test('global cd()', async () => {
    const cwd = (await $`pwd`).toString().trim()
    cd('/')
    assert.equal((await $`pwd`).toString().trim(), path.resolve('/'))
    cd(cwd)
    assert.equal((await $`pwd`).toString().trim(), cwd)
  })

  test('injects zx index to global', () => {
    for (const [key, value] of Object.entries(index)) {
      assert.equal(global[key], value)
    }
  })
})
