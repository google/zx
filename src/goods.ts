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
import { setTimeout as sleep } from 'node:timers/promises'
import nodeFetch, { RequestInfo, RequestInit } from 'node-fetch'
import { getCtx, getRootCtx } from './context.js'
import { colorize } from './print.js'

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
  if (getCtx().verbose) {
    if (typeof init !== 'undefined') {
      console.log('$', colorize(`fetch ${url}`), init)
    } else {
      console.log('$', colorize(`fetch ${url}`))
    }
  }
  return nodeFetch(url, init)
}

export function cd(path: string) {
  if (getCtx().verbose) console.log('$', colorize(`cd ${path}`))
  process.chdir(path)
  getRootCtx().cwd = getCtx().cwd = process.cwd()
}
