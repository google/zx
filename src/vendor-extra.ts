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

import { URL } from 'node:url'
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
import * as _yaml from 'yaml'
import * as _fs from 'fs-extra'
import _createRequire from 'create-require'
import { AbortController } from 'node-fetch-native'

export { fetch as nodeFetch } from 'node-fetch-native'

global.AbortController = global.AbortController || AbortController

export const createRequire = _createRequire as unknown as (
  filename: string | URL
) => NodeRequire

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

export const YAML: YAML = _yaml

export interface YAML {
  parse(text: string): any
  stringify(object: any): string
  /** @deprecated */
  parseAllDocuments(s: string, opts?: any): any[]
  /** @deprecated */
  parseDocument(s: string, opts?: any): any
  /** @deprecated */
  isAlias(v: any): boolean
  /** @deprecated */
  isCollection(v: any): boolean
  /** @deprecated */
  isDocument(v: any): boolean
  /** @deprecated */
  isMap(v: any): boolean
  /** @deprecated */
  isNode(v: any): boolean
  /** @deprecated */
  isPair(v: any): boolean
  /** @deprecated */
  isScalar(v: any): boolean
  /** @deprecated */
  isSeq(v: any): boolean
  /** @deprecated */
  Alias: any
  /** @deprecated */
  Composer: any
  /** @deprecated */
  Document: any
  /** @deprecated */
  Schema: any
  /** @deprecated */
  YAMLSeq: any
  /** @deprecated */
  YAMLMap: any
  /** @deprecated */
  YAMLError: any
  /** @deprecated */
  YAMLParseError: any
  /** @deprecated */
  YAMLWarning: any
  /** @deprecated */
  Pair: any
  /** @deprecated */
  Scalar: any
  /** @deprecated */
  Lexer: any
  /** @deprecated */
  LineCounter: any
  /** @deprecated */
  Parser: any
}

export const fs: typeof import('fs-extra') = _fs

export { depseekSync as depseek } from 'depseek'
export { default as minimist } from 'minimist'
export { default as dotenv } from 'envapi'
