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
import { test, describe } from 'bun:test'
import '../../build/globals.js'

describe('bun', () => {
  test('smoke test', async () => {
    const p = await $`echo foo`
    assert.match(p.stdout, /foo/)
  })

  test('captures err stack', async () => {
    const p = await $({ nothrow: true })`echo foo; exit 3`
    assert.match(p.message, /exit code: 3/)
  })

  test('stdio: inherit', async () => {
    await $({ stdio: 'inherit' })`ls`
  })
})
