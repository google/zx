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

import {ChildProcess} from 'child_process'
import {Readable, Writable} from 'stream'
import * as _fs from 'fs-extra'
import * as _globby from 'globby'
import * as _os from 'os'
import * as _path from 'path'
import {ChalkInstance} from 'chalk'
import * as _yaml from 'yaml'
import _fetch from 'node-fetch'
import {ParsedArgs} from 'minimist'

interface $ {
  (pieces: TemplateStringsArray, ...args: any[]): ProcessPromise<ProcessOutput>

  verbose: boolean
  shell: string
  prefix: string
  quote: (input: string) => string
}

export interface ProcessPromise<T> extends Promise<T> {
  child: ChildProcess
  readonly stdin: Writable
  readonly stdout: Readable
  readonly stderr: Readable
  readonly exitCode: Promise<number>

  pipe(dest: ProcessPromise<ProcessOutput> | Writable): ProcessPromise<ProcessOutput>

  kill(signal?: string | number): Promise<void>
}

export class ProcessOutput {
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly stdout: string
  readonly stderr: string

  toString(): string
}

export type QuestionOptions = { choices: string[] }

type cd = (path: string) => void
type nothrow = (p: ProcessPromise<ProcessOutput>) => ProcessPromise<ProcessOutput>
type question = (query?: string, options?: QuestionOptions) => Promise<string>
type sleep = (ms: number) => Promise<void>

export const $: $
export const argv: ParsedArgs
export const cd: cd
export const chalk: ChalkInstance
export const fetch: typeof _fetch
export const YAML: typeof _yaml
export const fs: typeof _fs
export const glob: typeof _globby.globby & typeof _globby
export const globby: typeof _globby.globby & typeof _globby
export const nothrow: nothrow
export const os: typeof _os
export const path: typeof _path
export const question: question
export const sleep: sleep
