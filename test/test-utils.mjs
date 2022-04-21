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

import chalk from 'chalk'
import {fileURLToPath} from 'node:url'
import {relative} from 'node:path'
import {sleep} from '../src/index.mjs'

export {strict as assert} from 'assert'

let queued = 0
let passed = 0
let failed = 0
let total = 0
let skipped = 0
let focused = 0

const singleThread = (fn) => {
  let p = Promise.resolve()
  return async function (...args) {
    return (p = p.catch(_ => _).then(() => fn.call(this, ...args)))
  }
}

const run = singleThread((cb) => cb())

const warmup = sleep(100)

const log = (name, group, err, file = '') => {
  if (err) {
    console.log(err)
    console.log(file)
  }
  console.log('\n' + chalk[err ? 'bgRedBright' : 'bgGreenBright'].black(`${chalk.inverse(' ' + group + ' ')} ${name} `))
}

export const test = async function (name, cb, ms, focus, skip) {
  const filter = RegExp(process.argv[3] || '.')
  const {group, meta} = this
  const file = meta ? relative(process.cwd(), fileURLToPath(meta.url)) : ''

  if (filter.test(name) || filter.test(group) || filter.test(file)) {
    focused += +!!focus
    queued++

    await warmup
    try {
      if (!focused === !focus && !skip) {
        await run(cb)
        passed++
        log(name, group)
      } else {
        skipped++
      }
    } catch (e) {
      log(name, group, e, file)
      failed++
    } finally {
      total++

      if (total === queued) {
        printTestDigest()
      }
    }
  }
}

export const only = async function (name, cb, ms) {
  return test.call(this, name, cb, ms, true, false)
}

export const skip = async function (name, cb, ms) {
  return test.call(this, name, cb, ms, false, true)
}

export const testFactory = (group, meta) => Object.assign(
  test.bind({group, meta}), {
    test,
    skip,
    only,
    group,
    meta
  })

export const printTestDigest = () => {
  console.log('\n' +
    chalk.black.bgYellowBright(` zx version is ${require('../package.json').version} `) + '\n' +
    chalk.greenBright(` 🍺 tests passed: ${passed} `) +
    (skipped ? chalk.yellowBright(`\n 🚧 skipped: ${skipped} `) : '') +
    (failed ? chalk.redBright(`\n ❌ failed: ${failed} `) : '')
  )
  failed && process.exit(1)
}
