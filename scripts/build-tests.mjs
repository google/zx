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
import * as vendor from '../build/vendor.js'

const root = path.resolve(new URL(import.meta.url).pathname, '../..')
const apis = ['chalk', 'depseek', 'fs', 'minimist', 'ps', 'which', 'YAML']
const copyright = await fs.readFileSync(
  path.resolve(root, 'test/fixtures/copyright.txt'),
  'utf8'
)

const filePath = path.resolve(root, `test/vendor-export.test.js`)
let fileContents = `${copyright.replace('YEAR', new Date().getFullYear())}
import assert from 'node:assert'
import { test, describe } from 'node:test'
import {
${apis.map((v) => '  ' + v).join(',\n')},
} from '../build/vendor.js'
`

apis.forEach((name) => {
  const api = vendor[name]
  const methods = Object.entries(api)
  const formatAssert = (k, v, prefix = '    ') =>
    `${prefix}assert.equal(typeof ${name}.${k}, '${typeof v}', '${name}.${k}')`
  const methodChecks = methods.length
    ? '\n' + methods.map(([k, v]) => formatAssert(k, v)).join('\n')
    : ''
  fileContents += `
describe('vendor ${name} API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof ${name}, '${typeof api}')${methodChecks}
  })
})
`
})

fs.writeFileSync(filePath, fileContents)
