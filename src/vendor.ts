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

declare module 'fast-glob' {
  namespace FastGlob {
    export type Entry = any
  }
}

import {
  globby,
  globbySync,
  globbyStream,
  generateGlobTasksSync,
  generateGlobTasks,
  isGitIgnoredSync,
  isGitIgnored,
  isDynamicPattern,
} from 'globby'
import * as yaml from 'yaml'
import * as _fs from 'fs-extra'

export {
  default as nodeFetch,
  type RequestInfo,
  type RequestInit,
} from 'node-fetch'
export const globbyModule = {
  globby,
  globbySync,
  globbyStream,
  generateGlobTasksSync,
  generateGlobTasks,
  isGitIgnoredSync,
  isGitIgnored,
  isDynamicPattern,
}

export const YAML: {
  parse(text: string): any
  stringify(object: any): string
} = yaml

export const fs: typeof import('fs-extra') = _fs

export { type Options as GlobbyOptions } from 'globby'
export { default as chalk, type ChalkInstance } from 'chalk'
export { default as which } from 'which'
export { default as minimist } from 'minimist'

export { ssh } from 'webpod'
export { default as psTreeModule } from 'ps-tree'
