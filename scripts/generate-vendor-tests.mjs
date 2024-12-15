#!/usr/bin/env node

// Copyright 2024 Google LLC
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

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { YAML, fs as vendorFs } from '../build/vendor.js'

const copyright = `// Copyright 2024 Google LLC
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
// limitations under the License.`

const testLibImports = `import assert from 'node:assert'
import { test, describe } from 'node:test'`

const newLine = '\n'

const vendors = [
  {
    name: 'YAML',
    module: YAML,
  },
  {
    name: 'fs',
    module: vendorFs,
  },
]

const cwd = process.cwd()

vendors.forEach(({ name, module }) => {
  const outputFile = path.resolve(
    cwd,
    `test/vendor-${name.toLowerCase()}.test.js`
  )

  const moduleImport = `import { ${name} } from '../build/vendor.js'`

  const fileText = [
    copyright,
    newLine,
    testLibImports,
    moduleImport,
    newLine,
    createDescribeBlock(
      name,
      createTestBlock(
        'has proper exports',
        Object.entries(module)
          .map(([k, v]) => `assert.equal(typeof ${name}.${k}, '${typeof v}')`)
          .join('\n')
      )
    ),
  ].join('\n')

  fs.writeFileSync(outputFile, fileText)
})

function createDescribeBlock(vendorName, content) {
  return [`describe('vendor ${vendorName}', () => {`, content, '})'].join('\n')
}

function createTestBlock(label, content) {
  return [`test('${label}', () => {`, content, '})'].join('\n')
}
