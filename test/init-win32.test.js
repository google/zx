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
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('$.shell defaults to true on win32', async () => {
  const originalPlatform = process.platform

  try {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    })

    // Bust the cache to re-evaluate the core module initialization
    const corePath = require.resolve('../build/core.js')
    delete require.cache[corePath]

    const { $ } = await import(`../build/core.js?update=${Date.now()}`)
    assert.equal($.shell, true)
  } finally {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
  }
})
