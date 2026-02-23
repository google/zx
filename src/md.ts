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
  let stripRe = /^/
  let endRe = /^$/
  let linePrefix = ''
  let closeOut = ''
  let closeBlank = false

  const isEnd = (s: string) => fenceChar && endRe.test(s)

  for (const line of bufToString(buf).split(/\r?\n/)) {
    switch (state) {
      case 'root': {
        const g = line.match(fenceRe)?.groups
        if (g?.fence) {
          fenceChar = g.fence[0]
          stripRe = g.indent ? new RegExp(`^ {0,${g.indent.length}}`) : /^/
          endRe = new RegExp(`^ {0,3}${fenceChar}{${g.fence.length},}[ \\t]*$`)

          if (g.js) {
            out.push('')
            linePrefix = ''
            closeOut = ''
            closeBlank = true
          } else if (g.bash) {
            out.push('await $`')
            linePrefix = ''
            closeOut = '`'
            closeBlank = false
          } else {
            out.push('')
            linePrefix = '// '
            closeOut = ''
            closeBlank = true
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
          if (closeOut) out.push(closeOut)
          else if (closeBlank) out.push('')
          state = 'root'
          prevEmpty = true
        } else {
          out.push(linePrefix + line.replace(stripRe, ''))
          prevEmpty = false
        }
        break
    }
  }

  return out.join('\n')
}
