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

import {echo, retry, startSpinner, withTimeout} from '../src/experimental.mjs'
import {assert, test as t} from './test-utils.mjs'
import chalk from 'chalk'

const test = t.bind(null, 'experimental')

if (test('Retry works')) {
  let exitCode = 0
  let now = Date.now()
  try {
    await retry(5, 50)`exit 123`
  } catch (p) {
    exitCode = p.exitCode
  }
  assert.equal(exitCode, 123)
  assert(Date.now() >= now + 50 * (5 - 1))
}

if (test('withTimeout works')) {
  let exitCode = 0
  let signal
  try {
    await withTimeout(100, 'SIGKILL')`sleep 9999`
  } catch (p) {
    exitCode = p.exitCode
    signal = p.signal
  }
  assert.equal(exitCode, null)
  assert.equal(signal, 'SIGKILL')

  let p = await withTimeout(0)`echo 'test'`
  assert.equal(p.stdout.trim(), 'test')
}

if (test('echo works')) {
  echo(chalk.red('foo'), chalk.green('bar'), chalk.bold('baz'))
  echo`${chalk.red('foo')} ${chalk.green('bar')} ${chalk.bold('baz')}`
  echo(await $`echo ${chalk.red('foo')}`, await $`echo ${chalk.green('bar')}`, await $`echo ${chalk.bold('baz')}`)
}

if (test('spinner works')) {
  let s = startSpinner('waiting')

  await sleep(1000)
  s()
}
