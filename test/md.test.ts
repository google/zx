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

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { transformMarkdown } from '../src/md.ts'

describe('md', () => {
  test('transformMarkdown()', () => {
    assert.equal(transformMarkdown('\n'), '// \n// ')
    assert.equal(transformMarkdown('  \n    '), '  \n    ')
    assert.equal(
      transformMarkdown(`
\t~~~js
console.log('js')`),
      `// \n\t~~~js\n// console.log('js')`
    )
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

  test('transformMarkdown() handles indented code fences in list items (#1389)', () => {
    // Fenced code blocks may be indented up to 3 spaces (CommonMark).
    // They must still be recognized as fenced blocks, not treated as text.
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

    // No raw markdown fences should survive transformation.
    assert.ok(!/```|~~~/.test(result), 'no raw fences should remain')

    // All bash blocks should become template invocations.
    const opens = result.match(/await \$`/g) ?? []
    assert.equal(opens.length, 3, 'all three bash blocks should be converted')

    // Each bash block should also close correctly.
    const closes = result.match(/^`$/gm) ?? []
    assert.equal(
      closes.length,
      3,
      'all bash blocks should close with a backtick'
    )
  })
})
