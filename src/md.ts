import { type Buffer } from 'node:buffer'
import { bufToString } from './util.ts'

export function transformMarkdown(buf: Buffer | string): string {
  const output = []
  const tabRe = /^(  +|\t)/
  const codeBlockRe =
    /^(?<indent> {0,3})(?<fence>(`{3,20}|~{3,20}))(?:(?<js>(js|javascript|ts|typescript))|(?<bash>(sh|shell|bash))|.*)$/

  let state = 'root'
  let fenceChar = ''
  let fenceLen = 0
  let fenceIndent = 0
  let prevLineIsEmpty = true
  let fenceIndentRe = /^/
  let fenceEndRe = /^$/

  const isFenceEnd = (line: string) => !!fenceChar && fenceEndRe.test(line)
  const stripFenceIndent = (line: string) => line.replace(fenceIndentRe, '')

  for (const line of bufToString(buf).split(/\r?\n/)) {
    switch (state) {
      case 'root':
        if (tabRe.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
          continue
        }

        const m = line.match(codeBlockRe)?.groups || {}
        const { indent = '', fence, js, bash } = m
        if (!fence) {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
          continue
        }

        fenceChar = fence[0]
        fenceLen = fence.length
        fenceIndent = indent.length
        fenceIndentRe = new RegExp(`^ {0,${fenceIndent}}`)
        fenceEndRe = new RegExp(`^ {0,3}${fenceChar}{${fenceLen},}[ \\t]*$`)

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
        if (isFenceEnd(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push(stripFenceIndent(line))
        }
        break

      case 'bash':
        if (isFenceEnd(line)) {
          output.push('`')
          state = 'root'
        } else {
          output.push(stripFenceIndent(line))
        }
        break

      case 'other':
        if (isFenceEnd(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push('// ' + stripFenceIndent(line))
        }
        break
    }
  }

  return output.join('\n')
}
