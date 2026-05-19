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

import { describe, test } from 'node:test'
import assert from 'node:assert'
import { transformMarkdown } from '../src/md.ts'

describe('transformMarkdown()', () => {
  describe('root handling', () => {
    test('comments out plain lines (including empty line)', () => {
      assert.equal(transformMarkdown('\n'), '// \n// ')
    })

    test('preserves 4+ space indented blocks after a blank line (CommonMark)', () => {
      assert.equal(transformMarkdown('    \n    '), '    \n    ')
    })

    test('does NOT treat 2-space indented list-item continuation as code (#1388)', () => {
      // CommonMark: indented code blocks require 4+ spaces. A 2-space-indented
      // line after a blank line under a list item is list continuation prose,
      // not code. Treating it as code throws SyntaxError on the next eval.
      const input = `- on localhost

  This assumes you have a local node running
`
      const result = transformMarkdown(input)
      // Prose line must be commented, not left as raw code.
      assert.ok(!/^  This assumes/m.test(result), 'expected prose line to not be left as raw code')
    })

    test('does not treat a mid-paragraph fence as a fenced block (legacy behavior)', () => {
      assert.equal(
        transformMarkdown(`
\t~~~js
console.log('js')`),
        `// \n\t~~~js\n// console.log('js')`
      )
    })
  })

  describe('fenced code blocks', () => {
    test('converts js/ts to raw code, bash to await $`...` and comments unknown fences', () => {
      // prettier-ignore
      assert.equal(transformMarkdown(`
# Title
    
~~~js
await $\`echo "js"\`
~~~

typescript code block
~~~~~ts
await $\`echo "ts"\`
~~~~~

~~~
unknown code block
~~~

~~~sh
echo foo
~~~

`), `// 
// # Title
//     

await $\`echo "js"\`

// 
// typescript code block

await $\`echo "ts"\`

// 

// unknown code block

// 
await $\`
echo foo
\`
// 
// `)
    })

    test('accepts fences indented up to 3 spaces (CommonMark) and converts them', () => {
      const input = `# h1

paragraph

## h2

### h3

\`\`\`bash
echo "1"
\`\`\`

### h3

- item 1

   \`\`\`bash
   echo "2"
   \`\`\`

### h3

\`\`\`bash
echo "4"
\`\`\`
`
      const result = transformMarkdown(input)

      assert.ok(!/```|~~~/.test(result), 'no raw markdown fences should remain')
      assert.equal((result.match(/await \$`/g) ?? []).length, 3)
      assert.equal((result.match(/^`$/gm) ?? []).length, 3)
    })
  })

  test('handles all ECMAScript line terminators', () => {
    const input = 'a\r\nb\nc\rd\u2028e\u2029f'
    const expected = '// a\n// b\n// c\n// d\n// e\n// f'
    assert.equal(transformMarkdown(input), expected)
  })
})
