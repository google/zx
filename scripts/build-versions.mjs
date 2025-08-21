#!/usr/bin/env node

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

import fs from 'fs-extra'
import path from 'node:path'
import minimist from 'minimist'

const root = path.resolve(new URL(import.meta.url).pathname, '../..')
const copyright = await fs.readFileSync(
  path.resolve(root, 'test/fixtures/copyright.txt'),
  'utf8'
)
const license = copyright.replace('YEAR', new Date().getFullYear())
const deps = [
  'chalk',
  'depseek',
  'dotenv',
  'fetch',
  'fs',
  'glob',
  'minimist',
  'ps',
  'which',
  'yaml',
]
const namemap = {
  dotenv: 'envapi',
  fs: 'fs-extra',
  fetch: 'node-fetch-native',
  glob: 'globby',
  ps: '@webpod/ps',
}
const versions = deps.reduce(
  (m, name) => {
    m[name] = fs.readJsonSync(
      path.resolve(root, 'node_modules', namemap[name] || name, 'package.json')
    ).version
    return m
  },
  {
    zx: fs.readJsonSync(path.join(root, 'package.json')).version,
  }
)

const argv = minimist(process.argv.slice(2), {
  default: versions,
  string: ['zx', ...deps],
})

delete argv._

const list = JSON.stringify(argv, null, 2)
  .replaceAll('  "', '  ')
  .replaceAll('": ', ': ')
  .replaceAll('"', "'")
  .replace(/\n}$/, ',\n}')

const versionsTs = `${license}
export const versions: Record<string, string> = ${list}
`
const versionsCjs = `${license}
module.exports = { versions: ${list}
`

fs.writeFileSync(path.join(root, 'src/versions.ts'), versionsTs, 'utf8')
// fs.writeFileSync(path.join(root, 'build/versions.cjs'), versionsCjs, 'utf8')
