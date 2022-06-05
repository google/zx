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

import { RequestInit } from 'node-fetch'
import { inspect } from 'node:util'
import { $, ProcessPromise } from './core.js'
import { colorize } from './util.js'

export type LogKind = 'cmd' | 'stdout' | 'stderr' | 'cd' | 'fetch'
export type LogExtra = {
  source?: ProcessPromise
  init?: RequestInit
}

export function log(kind: LogKind, data: string, extra: LogExtra = {}) {
  if (extra.source?.isQuiet()) return
  if ($.verbose) {
    switch (kind) {
      case 'cmd':
        process.stderr.write(formatCmd(data))
        break
      case 'stdout':
      case 'stderr':
        process.stderr.write(data)
        break
      case 'cd':
        process.stderr.write('$ ' + colorize(`cd ${data}`) + '\n')
        break
      case 'fetch':
        const init = extra.init ? ' ' + inspect(extra.init) : ''
        process.stderr.write('$ ' + colorize(`fetch ${data}`) + init + '\n')
        break
      default:
        throw new Error(`Unknown log kind "${kind}".`)
    }
  }
}

export function formatCmd(cmd: string) {
  if (/\n/.test(cmd)) {
    return (
      cmd
        .split('\n')
        .map((line, i) => `${i == 0 ? '$' : '>'} ${colorize(line)}`)
        .join('\n') + '\n'
    )
  } else {
    return `$ ${colorize(cmd)}\n`
  }
}
