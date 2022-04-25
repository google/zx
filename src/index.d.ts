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

declare module 'zx' {
  import {ChildProcess, spawn} from 'node:child_process'
  import {Readable, Writable} from 'node:stream'
  import * as _fs from 'fs-extra'
  import * as _globby from 'globby'
  import * as _os from 'node:os'
  import * as _path from 'node:path'
  import {ChalkInstance} from 'chalk'
  import * as _yaml from 'yaml'
  import _fetch from 'node-fetch'
  import {ParsedArgs} from 'minimist'
  import * as _which from 'which'

  export interface ZxTemplate {
    (pieces: TemplateStringsArray, ...args: any[]): ProcessPromise<ProcessOutput>
  }

  interface $ extends ZxTemplate {
    verbose: boolean
    shell: string
    prefix: string
    quote: (input: string) => string
    spawn: typeof spawn
    maxBuffer?: number | undefined
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
  type quiet = (p: ProcessPromise<ProcessOutput>) => ProcessPromise<ProcessOutput>

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
  export const quiet: quiet
  export const which: typeof _which
}

declare module 'zx/globals' {
  import {
    $,
    argv as _argv,
    cd,
    chalk as _chalk,
    fetch as _fetch,
    fs as _fs,
    globby as _globby,
    nothrow,
    os as _os,
    path as _path,
    question,
    sleep,
    which as _which,
  } from 'zx'

  global {
    var $: $
    var argv: typeof _argv
    var cd: cd
    var chalk: typeof _chalk
    // @ts-ignore
    var fetch: typeof _fetch
    var fs: typeof _fs
    var globby: typeof _globby.globby & typeof _globby
    var glob: typeof _globby.globby & typeof _globby
    var nothrow: nothrow
    var os: typeof _os
    var path: typeof _path
    var question: question
    var sleep: sleep
    var which: typeof _which
  }
}

declare module 'zx/experimental' {
  import {ZxTemplate} from 'zx'

  interface Echo {
    (pieces: TemplateStringsArray, ...args: any[]): void
    (...args: any[]): void
  }
  export const echo: Echo

  export const retry: (count?: number, delay?: number) => ZxTemplate

  export const withTimeout: (delay?: number, signal?: string | number) => ZxTemplate

  type StopSpinner = () => void
  export function startSpinner(title: string): StopSpinner
}

