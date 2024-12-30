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
import * as core from '../build/core.js'
import * as cli from '../build/cli.js'
import * as index from '../build/index.js'

// prettier-ignore
const modules = [
  ['core', core],
  ['cli', cli],
  ['index', index],
  ['vendor', vendor, ['chalk', 'depseek', 'dotenv', 'fs', 'glob', 'minimist', 'ps', 'which', 'YAML',]],
]
const root = path.resolve(new URL(import.meta.url).pathname, '../..')
const filePath = path.resolve(root, `test/export.test.js`)

const copyright = await fs.readFileSync(
  path.resolve(root, 'test/fixtures/copyright.txt'),
  'utf8'
)

let head = `${copyright.replace('YEAR', new Date().getFullYear())}
import assert from 'node:assert'
import { test, describe } from 'node:test'`
let body = '\n'

for (const [name, ref, apis = Object.keys(ref).sort()] of modules) {
  head += `\nimport * as ${name} from '../build/${name}.js'`
  body += `\n//prettier-ignore\ndescribe('${name}', () => {\n`
  body += `  test('exports', () => {\n`
  for (const r of apis) {
    const api = ref[r]
    body += `    assert.equal(typeof ${name}.${r}, '${typeof api}', '${name}.${r}')\n`
    if (typeof api !== 'function' && typeof api !== 'object') continue
    for (const k of Object.keys(api).sort()) {
      const v = api[k]
      body += `    assert.equal(typeof ${name}.${r}.${k}, '${typeof v}', '${name}.${r}.${k}')\n`
    }
  }
  body += '  })\n'
  body += '})\n'
}

const contents = head + body

fs.writeFileSync(filePath, contents)
