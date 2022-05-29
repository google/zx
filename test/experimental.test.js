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

import test from 'ava'
import '../build/globals.js'

$.verbose = false

import {
  echo,
  retry,
  startSpinner,
  withTimeout,
} from '../build/experimental.js'

test('Retry works', async (t) => {
  let exitCode = 0
  let now = Date.now()
  try {
    await retry(5, 50)`exit 123`
  } catch (p) {
    exitCode = p.exitCode
  }
  t.is(exitCode, 123)
  t.true(Date.now() >= now + 50 * (5 - 1))
})

test('withTimeout works', async (t) => {
  let exitCode = 0
  let signal
  try {
    await withTimeout(100, 'SIGKILL')`sleep 9999`
  } catch (p) {
    exitCode = p.exitCode
    signal = p.signal
  }
  t.is(exitCode, null)
  t.is(signal, 'SIGKILL')

  let p = await withTimeout(0)`echo 'test'`
  t.is(p.stdout.trim(), 'test')
})

test('echo works', async (t) => {
  echo(chalk.cyan('foo'), chalk.green('bar'), chalk.bold('baz'))
  echo`${chalk.cyan('foo')} ${chalk.green('bar')} ${chalk.bold('baz')}`
  echo(
    await $`echo ${chalk.cyan('foo')}`,
    await $`echo ${chalk.green('bar')}`,
    await $`echo ${chalk.bold('baz')}`
  )
  t.pass()
})

test('spinner works', async (t) => {
  let s = startSpinner('waiting')
  await sleep(1000)
  s()
  t.pass()
})
