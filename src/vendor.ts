// Copyright 2024 Google LLC
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

import {
  convertPathToPattern,
  globby,
  globbySync,
  globbyStream,
  generateGlobTasksSync,
  generateGlobTasks,
  isGitIgnoredSync,
  isGitIgnored,
  isDynamicPattern,
  type Options as GlobbyOptions,
} from 'globby'

import * as yaml from 'yaml'
import * as _fs from 'fs-extra'
import type { fetch } from 'node-fetch-native'

export { exec, buildCmd } from 'zurk/spawn'

export { fetch as nodeFetch } from 'node-fetch-native'
export type RequestInfo = Parameters<typeof fetch>[0]
export type RequestInit = Parameters<typeof fetch>[1]

export const globbyModule = {
  convertPathToPattern,
  globby,
  globbySync,
  globbyStream,
  generateGlobTasksSync,
  generateGlobTasks,
  isGitIgnoredSync,
  isGitIgnored,
  isDynamicPattern,
}

export const glob = Object.assign(function globby(
  patterns: string | readonly string[],
  options?: GlobbyOptions
) {
  return globbyModule.globby(patterns, options)
}, globbyModule) as (typeof globbyModule)['globby'] & typeof globbyModule

export const YAML: {
  parse(text: string): any
  stringify(object: any): string
} = yaml

export const fs: typeof import('fs-extra') = _fs

export { depseekSync as depseek } from 'depseek'
export { default as chalk, type ChalkInstance } from 'chalk'
export { default as which } from 'which'
export { default as minimist } from 'minimist'
export { default as ps } from '@webpod/ps'
export { parseLine } from '@webpod/ingrid'
