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
import '../build/globals.js'

import {
  echo,
  retry,
  startSpinner,
  withTimeout,
} from '../build/experimental.js'

import chalk from 'chalk'

$.verbose = false

test('retry works', async () => {
  let exitCode = 0
  let now = Date.now()
  try {
    await retry(5, 50)`exit 123`
  } catch (p) {
    exitCode = p.exitCode
  }
  assert.is(exitCode, 123)
  assert.ok(Date.now() >= now + 50 * (5 - 1))
})

test('withTimeout works', async () => {
  let exitCode = 0
  let signal
  try {
    await withTimeout(100, 'SIGKILL')`sleep 9999`
  } catch (p) {
    exitCode = p.exitCode
    signal = p.signal
  }
  assert.is(exitCode, null)
  assert.is(signal, 'SIGKILL')

  let p = await withTimeout(0)`echo 'test'`
  assert.is(p.stdout.trim(), 'test')
})

test('echo works', async () => {
  echo(chalk.cyan('foo'), chalk.green('bar'), chalk.bold('baz'))
  echo`${chalk.cyan('foo')} ${chalk.green('bar')} ${chalk.bold('baz')}`
  echo(
    await $`echo ${chalk.cyan('foo')}`,
    await $`echo ${chalk.green('bar')}`,
    await $`echo ${chalk.bold('baz')}`
  )
})

test('spinner works', async () => {
  let s = startSpinner('waiting')
  await sleep(1000)
  s()
})

test.run()
