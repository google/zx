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

import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { log } from '../build/log.js'

test('logger works', async () => {
  $.verbose = 1
  let stdout = ''
  let stderr = ''
  $.logFormat = (msg) => msg.map((m) => m.toUpperCase())
  $.logPrint = (data, err) => {
    if (data) stdout += data
    if (err) stderr += err
  }
  $.logIgnore = ['b*', 'fetch']
  log({ scope: 'foo' }, 'foo-test')
  log({ scope: 'bar' }, 'bar-test')
  log({ scope: 'baz' }, 'baz-test')
  log({ scope: 'fetch' }, 'example.com')

  assert.ok(stderr.includes('FOO-TEST'))
  assert.ok(!stderr.includes('BAR-TEST'))
  assert.ok(!stderr.includes('BAZ-TEST'))
  assert.ok(!stderr.includes('EXAMPLE.COM'))

  $.logOutput = 'stdout'
  log({ scope: 'foo' }, 'foo')
  assert.ok(stdout.includes('FOO'))

  delete $.logPrint
  delete $.logFormat
  delete $.logIgnore
  delete $.logOutput
  $.verbose = 0
})

test.run()
