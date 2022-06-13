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

import { ProcessOutput, $, Zx } from './core.js'
import { sleep } from './goods.js'
import { isString } from './util.js'
import { getCtx, runInCtx } from './context.js'
import { log } from './print.js'

export { log }

// Retries a command a few times. Will return after the first
// successful attempt, or will throw after specifies attempts count.
export function retry(count = 5, delay = 0) {
  return async function (cmd: TemplateStringsArray, ...args: any[]) {
    while (count-- > 0)
      try {
        return await $(cmd, ...args)
      } catch (p) {
        if (count === 0) throw p
        if (delay) await sleep(delay)
      }
    return
  }
}

// Runs and sets a timeout for a cmd
export function withTimeout(timeout: number, signal: string) {
  return async function (cmd: TemplateStringsArray, ...args: any[]) {
    let p = $(cmd, ...args)
    if (!timeout) return p

    let timer = setTimeout(() => p.kill(signal), timeout)

    return p.finally(() => clearTimeout(timer))
  }
}

// A console.log() alternative which can take ProcessOutput.
export function echo(pieces: TemplateStringsArray, ...args: any[]) {
  let msg
  let lastIdx = pieces.length - 1
  if (
    Array.isArray(pieces) &&
    pieces.every(isString) &&
    lastIdx === args.length
  ) {
    msg =
      args.map((a, i) => pieces[i] + stringify(a)).join('') + pieces[lastIdx]
  } else {
    msg = [pieces, ...args].map(stringify).join(' ')
  }
  console.log(msg)
}

function stringify(arg: ProcessOutput | any) {
  if (arg instanceof ProcessOutput) {
    return arg.toString().replace(/\n$/, '')
  }
  return `${arg}`
}

// Starts a simple CLI spinner, and returns stop() func.
export function startSpinner(title = '') {
  let i = 0,
    spin = () => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  return (
    (id) => () =>
      clearInterval(id)
  )(setInterval(spin, 100))
}

export function ctx<R extends any>(cb: (_$: Zx) => R): R {
  const _$ = Object.assign($.bind(null), getCtx())

  return runInCtx(_$, cb, _$)
}
