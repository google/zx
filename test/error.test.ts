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
  getErrnoMessage,
  getExitCodeInfo,
  getCallerLocation,
  getCallerLocationFromString,
  formatExitMessage,
  formatErrorMessage,
} from '../src/error.ts'

describe('error', () => {
  test('getExitCodeInfo()', () => {
    assert.equal(getExitCodeInfo(2), 'Misuse of shell builtins')
  })

  test('getErrnoMessage()', () => {
    assert.equal(getErrnoMessage(-2), 'No such file or directory')
    assert.equal(getErrnoMessage(1e9), 'Unknown error')
    assert.equal(getErrnoMessage(undefined), 'Unknown error')
  })

  describe('getCallerLocation()', () => {
    assert.match(getCallerLocation(new Error('Foo')), /Suite\.runInAsyncScope/)
  })

  describe('getCallerLocationFromString()', () => {
    test('empty', () => {
      assert.equal(getCallerLocationFromString(), 'unknown')
    })

    test('no-match', () => {
      assert.equal(
        getCallerLocationFromString('stack\nstring'),
        'stack\nstring'
      )
    })

    test(`getCallerLocationFromString-v8`, () => {
      const stack = `
    Error
      at getCallerLocation (/Users/user/test.js:22:17)
      at e (/Users/user/test.js:34:13)
      at d (/Users/user/test.js:11:5)
      at c (/Users/user/test.js:8:5)
      at b (/Users/user/test.js:5:5)
      at a (/Users/user/test.js:2:5)
      at Object.<anonymous> (/Users/user/test.js:37:1)
      at Module._compile (node:internal/modules/cjs/loader:1254:14)
      at Module._extensions..js (node:internal/modules/cjs/loader:1308:10)
      at Module.load (node:internal/modules/cjs/loader:1117:32)
      at Module._load (node:internal/modules/cjs/loader:958:12)
    `
      assert.match(getCallerLocationFromString(stack), /^.*:11:5.*$/)
    })

    test(`getCallerLocationFromString-JSC`, () => {
      const stack = `
    getCallerLocation@/Users/user/test.js:22:17
    e@/Users/user/test.js:34:13
    d@/Users/user/test.js:11:5
    c@/Users/user/test.js:8:5
    b@/Users/user/test.js:5:5
    a@/Users/user/test.js:2:5
    module code@/Users/user/test.js:37:1
    evaluate@[native code]
    moduleEvaluation@[native code]
    moduleEvaluation@[native code]
    @[native code]
    asyncFunctionResume@[native code]
    promiseReactionJobWithoutPromise@[native code]
    promiseReactionJob@[native code]
    d@/Users/user/test.js:11:5
  `
      assert.match(getCallerLocationFromString(stack), /^.*:11:5.*$/)
    })
  })

  test('getExitMessage()', () => {
    assert.match(formatExitMessage(2, null, '', ''), /Misuse of shell builtins/)
    assert.match(formatExitMessage(1, 'SIGKILL', '', ''), /SIGKILL/)
  })

  test('getErrorMessage()', () => {
    assert.match(
      formatErrorMessage({ errno: -2 } as NodeJS.ErrnoException, ''),
      /No such file or directory/
    )
    assert.match(
      formatErrorMessage({ errno: -1e9 } as NodeJS.ErrnoException, ''),
      /Unknown error/
    )
    assert.match(
      formatErrorMessage({} as NodeJS.ErrnoException, ''),
      /Unknown error/
    )
  })
})
