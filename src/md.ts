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
  const output = []
  const tabRe = /^(  +|\t)/
  const codeBlockRe =
    /^(?<fence>(`{3,20}|~{3,20}))(?:(?<js>(js|javascript|ts|typescript))|(?<bash>(sh|shell|bash))|.*)$/
  let state = 'root'
  let codeBlockEnd = ''
  let prevLineIsEmpty = true
  for (const line of bufToString(buf).split(/\r?\n/)) {
    switch (state) {
      case 'root':
        if (tabRe.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
          continue
        }
        const { fence, js, bash } = line.match(codeBlockRe)?.groups || {}
        if (!fence) {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
          continue
        }
        codeBlockEnd = fence
        if (js) {
          state = 'js'
          output.push('')
        } else if (bash) {
          state = 'bash'
          output.push('await $`')
        } else {
          state = 'other'
          output.push('')
        }
        break
      case 'tab':
        if (line === '') {
          output.push('')
        } else if (tabRe.test(line)) {
          output.push(line)
        } else {
          output.push('// ' + line)
          state = 'root'
        }
        break
      case 'js':
        if (line === codeBlockEnd) {
          output.push('')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'bash':
        if (line === codeBlockEnd) {
          output.push('`')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'other':
        if (line === codeBlockEnd) {
          output.push('')
          state = 'root'
        } else {
          output.push('// ' + line)
        }
        break
    }
  }
  return output.join('\n')
}
