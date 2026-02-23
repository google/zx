// Copyright 2025 Google LLC
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

import { type Buffer } from 'node:buffer'
import { bufToString } from './util.ts'

export function transformMarkdown(buf: Buffer | string): string {
  const out: string[] = []
  const tabRe = /^(  +|\t)/
  const fenceRe =
    /^(?<indent> {0,3})(?<fence>(`{3,20}|~{3,20}))(?:(?<js>js|javascript|ts|typescript)|(?<bash>sh|shell|bash)|.*)$/

  let state = 'root'
  let prevEmpty = true

  let fenceChar = ''
  let stripRe: RegExp | null = null
  let endRe = /^$/
  let linePrefix = ''
  let closeOut = ''

  const isEnd = (s: string) => fenceChar !== '' && endRe.test(s)

  for (const line of bufToString(buf).split(/\r?\n/)) {
    switch (state) {
      case 'root': {
        const g = line.match(fenceRe)?.groups
        if (g?.fence) {
          fenceChar = g.fence[0]
          stripRe = g.indent ? new RegExp(`^ {0,${g.indent.length}}`) : null
          endRe = new RegExp(`^ {0,3}${fenceChar}{${g.fence.length},}[ \\t]*$`)

          if (g.js) {
            out.push('')
            linePrefix = ''
            closeOut = ''
          } else if (g.bash) {
            out.push('await $`')
            linePrefix = ''
            closeOut = '`'
          } else {
            out.push('')
            linePrefix = '// '
            closeOut = ''
          }

          state = 'fence'
          prevEmpty = false
          break
        }

        if (prevEmpty && tabRe.test(line)) {
          out.push(line)
          state = 'tab'
          continue
        }

        prevEmpty = line === ''
        out.push('// ' + line)
        continue
      }

      case 'tab':
        if (line === '') out.push('')
        else if (tabRe.test(line)) out.push(line)
        else {
          out.push('// ' + line)
          state = 'root'
        }
        prevEmpty = line === ''
        break

      case 'fence':
        if (isEnd(line)) {
          out.push(closeOut)
          state = 'root'
          prevEmpty = true
          fenceChar = ''
        } else {
          const s = stripRe ? line.replace(stripRe, '') : line
          out.push(linePrefix + s)
          prevEmpty = false
        }
        break
    }
  }

  return out.join('\n')
}
