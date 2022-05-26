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

import { getCtx } from './als.mjs'
import { chalk } from './goods.mjs'

export function printCmd(cmd) {
  if (!getCtx()?.verbose) return
  if (/\n/.test(cmd)) {
    console.log(
      cmd
        .split('\n')
        .map((line, i) => (i === 0 ? '$' : '>') + ' ' + colorize(line))
        .join('\n')
    )
  } else {
    console.log('$', colorize(cmd))
  }
}

export function printStd(data, err) {
  if (!getCtx()?.verbose) return
  if (data) process.stdout.write(data)
  if (err) process.stderr.write(err)
}

export function colorize(cmd) {
  return cmd.replace(/^[\w_.-]+(\s|$)/, (substr) => {
    return chalk.greenBright(substr)
  })
}
