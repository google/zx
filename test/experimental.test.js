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
  ctx,
} from '../build/experimental.js'

import chalk from 'chalk'

import { ProcessPromise } from '../build/core.js'
import { randomId } from '../build/util.js'

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

test('ctx() provides isolates running scopes', async () => {
  $.verbose = true

  await ctx(async ($) => {
    $.verbose = false
    await $`echo a`

    $.verbose = true
    await $`echo b`

    $.verbose = false
    await ctx(async ($) => {
      await $`echo d`

      await ctx(async ($) => {
        assert.ok($.verbose === false)

        await $`echo e`
        $.verbose = true
      })
      $.verbose = true
    })

    await $`echo c`
  })

  await $`echo f`

  await ctx(async ($) => {
    assert.is($.verbose, true)
    $.verbose = false
    await $`echo g`
  })

  assert.is($.verbose, true)

  $.o =
    (opts) =>
    (...args) =>
      ctx(($) => Object.assign($, opts)(...args))

  const createHook = (opts, name = randomId(), cb = (v) => v, configurable) => {
    ProcessPromise.prototype[name] = function (...args) {
      Object.assign(this.ctx, opts)
      return cb(this, ...args)
    }

    const getP = (p, opts, $args) =>
      p instanceof ProcessPromise ? p : $.o(opts)(...$args)

    return (...args) => {
      if (!configurable) {
        const p = getP(args[0], opts, args)
        return p[name]()
      }

      return (...$args) => {
        const p = getP($args[0], opts, $args)
        return p[name](...args)
      }
    }
  }

  const quiet = createHook({ verbose: false }, 'quiet')
  const debug = createHook({ verbose: 2 }, 'debug')

  const timeout = createHook(
    null,
    'timeout',
    (p, t, signal) => {
      if (!t) return p
      let timer = setTimeout(() => p.kill(signal), t)

      return Object.assign(
        p.finally(() => clearTimeout(timer)),
        p
      )
    },
    true
  )

  await quiet`echo 'quiet'`
  await debug($`echo 'debug'`)
  await $`echo 'chained'`.quiet()

  try {
    await quiet(timeout(100, 'SIGKILL')`sleep 9999`)
  } catch {
    console.log('killed1')
  }

  try {
    const p = $`sleep 9999`
    await quiet(timeout(100, 'SIGKILL')(p))
  } catch {
    console.log('killed2')
  }

  try {
    await $`sleep 9999`.quiet().timeout(100, 'SIGKILL')
  } catch {
    console.log('killed3')
  }

  $.verbose = false
})

test.run()
