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

import { AsyncLocalStorage } from 'node:async_hooks'
import { spawn } from 'node:child_process'

export interface Options {
  verbose: boolean | number
  cwd: string
  env: NodeJS.ProcessEnv
  prefix: string
  shell: string | boolean
  maxBuffer: number
  quote: (v: string) => string
  spawn: typeof spawn
  logOutput?: 'stdout' | 'stderr'
  logFormat?: (...msg: any[]) => string | string[]
  logPrint?: (data: any, err?: any) => void
  logIgnore?: string | string[]
}

export interface Context extends Options {
  nothrow?: boolean
  cmd: string
  __from: string
  resolve: any
  reject: any
}

let root: Options

const storage = new AsyncLocalStorage<Options>()

export function getCtx() {
  return (storage.getStore() as Context) || getRootCtx()
}

export function setRootCtx(ctx: Options) {
  root = ctx
}

export function getRootCtx() {
  return root
}

export const runInCtx = <R, TArgs extends any[]>(
  ctx: Options = root,
  cb: (...args: TArgs) => R,
  ...args: TArgs
): R => storage.run(ctx, cb, ...args)
