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

import { RequestInfo, RequestInit } from 'node-fetch'
import { inspect } from 'node:util'
import { $ } from './core.js'
import { colorize } from './util.js'

export type LogEntry =
  | {
      kind: 'cmd'
      verbose: boolean
      cmd: string
    }
  | {
      kind: 'stdout' | 'stderr'
      verbose: boolean
      data: Buffer
    }
  | {
      kind: 'cd'
      dir: string
    }
  | {
      kind: 'fetch'
      url: RequestInfo
      init?: RequestInit
    }
  | { kind: 'custom'; data: any }

export function log(entry: LogEntry) {
  switch (entry.kind) {
    case 'cmd':
      if (!entry.verbose) return
      process.stderr.write(formatCmd(entry.cmd))
      break
    case 'stdout':
    case 'stderr':
      if (!entry.verbose) return
      process.stderr.write(entry.data)
      break
    case 'cd':
      if (!$.verbose) return
      process.stderr.write('$ ' + colorize(`cd ${entry.dir}`) + '\n')
      break
    case 'fetch':
      if (!$.verbose) return
      const init = entry.init ? ' ' + inspect(entry.init) : ''
      process.stderr.write('$ ' + colorize(`fetch ${entry.url}`) + init + '\n')
      break
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
