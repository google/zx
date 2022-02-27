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

import {ProcessOutput} from './index.mjs'

// Retries a command a few times. Will return after the first
// successful attempt, or will throw after specifies attempts count.
export const retry = (count = 5) => async (cmd, ...args) => {
  while (count --> 0) try {
    return await $(cmd, ...args)
  } catch (p) {
    if (count === 0) throw p
  }
}

// A console.log() alternative which can take ProcessOutput.
export function echo(pieces, ...args) {
  if (Array.isArray(pieces) && pieces.every(isString) && pieces.length - 1 === args.length) {
    let msg = pieces[0], i = 0
    while (i < args.length) {
      msg += stringify(args[i]) + pieces[++i]
    }
    console.log(msg)
  } else {
    let msg = []
    for (let it of [pieces, ...args]) {
      msg.push(it instanceof ProcessOutput ? stringify(it) : it)
    }
    console.log(...msg)
  }
}

function isString(obj) {
  return typeof obj === 'string'
}

function stringify(arg) {
  if (arg instanceof ProcessOutput) {
    return arg.toString().replace(/\n$/, '')
  }
  return `${arg}`
}

// Starts a simple CLI spinner, and returns stop() func.
export function startSpinner(title = '') {
  let i = 0, spin = () => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  return (id => () => clearInterval(id))(setInterval(spin, 100))
}
