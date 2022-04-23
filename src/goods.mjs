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
import { promisify } from 'node:util'
import psTreeModule from 'ps-tree'
import nodeFetch from 'node-fetch'
import {getCtx} from './als.mjs'
import {colorize} from './print.mjs'

export { default as chalk } from 'chalk'
export { default as fs } from 'fs-extra'
export { default as which } from 'which'
export { default as YAML } from 'yaml'
export { default as path } from 'node:path'

export const argv = minimist(process.argv.slice(2))

export const globby = Object.assign(function globby(...args) {
  return globbyModule.globby(...args)
}, globbyModule)

export const glob = globby

export const sleep = promisify(setTimeout)

export const psTree = promisify(psTreeModule)

export async function fetch(url, init) {
  if (getCtx().verbose) {
    if (typeof init !== 'undefined') {
      console.log('$', colorize(`fetch ${url}`), init)
    } else {
      console.log('$', colorize(`fetch ${url}`))
    }
  }
  return nodeFetch(url, init)
}

export function cd(path) {
  if (getCtx().verbose) console.log('$', colorize(`cd ${path}`))
  process.chdir(path)
}
