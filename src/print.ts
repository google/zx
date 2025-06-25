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

import { getCtx, getRootCtx } from './context.js'
import { chalk } from './goods.js'
import ignore from 'ignore'
import { asArray } from './util.js'

export function printStd(data: any, err?: any) {
  if (data) process.stdout.write(data)
  if (err) process.stderr.write(err)
}

export function colorize(cmd: string) {
  return cmd.replace(/^[\w_.-]+(\s|$)/, (substr) => {
    return chalk.greenBright(substr)
  })
}

export function log(
  opts: {
    scope: string
    verbose?: 0 | 1 | 2
    output?: 'stdout' | 'stderr'
    raw?: boolean
  },
  ...msg: any[]
) {
  let { scope, verbose = 1, output, raw } = opts
  let ctx = getCtx()
  let {
    logOutput = output,
    logFormat = () => msg,
    logPrint = printStd,
    logIgnore = [],
  } = ctx
  let level = Math.min(+getRootCtx().verbose, +ctx.verbose)
  if (verbose > level) return

  const ig = ignore().add(logIgnore)

  if (!ig.ignores(scope)) {
    msg = raw ? msg[0] : asArray(logFormat(msg)).join(' ') + '\n'
    // @ts-ignore
    logPrint(...(logOutput === 'stderr' ? [null, msg] : [msg]))
  }
}

export function printCmd(cmd: string): void {
  if (/\n/.test(cmd)) {
    log(
      { scope: 'cmd' },
      cmd
        .split('\n')
        .map((line, i) => (i === 0 ? '$' : '>') + ' ' + colorize(line))
        .join('\n')
    )
  } else {
    log({ scope: 'cmd' }, '$', colorize(cmd))
  }
}
