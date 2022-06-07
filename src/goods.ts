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

import * as globbyModule from 'globby'
import minimist from 'minimist'
import nodeFetch, { RequestInfo, RequestInit } from 'node-fetch'
import { createInterface } from 'node:readline'
import { setTimeout as sleep } from 'node:timers/promises'
import { $ } from './core.js'
import { isString, stringify } from './util.js'

export { default as chalk } from 'chalk'
export { default as fs } from 'fs-extra'
export { default as which } from 'which'
export { default as YAML } from 'yaml'
export { default as path } from 'node:path'
export { default as os } from 'node:os'
export { sleep }

export const argv = minimist(process.argv.slice(2))

export const globby = Object.assign(function globby(
  patterns: string | readonly string[],
  options?: globbyModule.Options
) {
  return globbyModule.globby(patterns, options)
},
globbyModule)
export const glob = globby

export async function fetch(url: RequestInfo, init?: RequestInit) {
  $.log({ kind: 'fetch', url, init })
  return nodeFetch(url, init)
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

export async function question(
  query?: string,
  options?: { choices: string[] }
): Promise<string> {
  let completer = undefined
  if (options && Array.isArray(options.choices)) {
    /* c8 ignore next 5 */
    completer = function completer(line: string) {
      const completions = options.choices
      const hits = completions.filter((c) => c.startsWith(line))
      return [hits.length ? hits : completions, line]
    }
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer,
  })

  return new Promise((resolve) =>
    rl.question(query ?? '', (answer) => {
      rl.close()
      resolve(answer)
    })
  )
}
