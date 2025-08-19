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

// Prepares a lite (core) version of zx to publish

import fs from 'node:fs'
import path from 'node:path'
import { depseekSync } from 'depseek'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '..')
const source = 'package.json'
const dest = 'package-lite.json'
const _pkgJson = JSON.parse(fs.readFileSync(path.join(root, source), 'utf-8'))

const files = new Set()
const entries = new Set(['./core.js', './3rd-party-licenses'])

for (const entry of entries) {
  if (!fs.existsSync(path.join(root, 'build', entry))) continue

  files.add(entry)
  const contents = fs.readFileSync(path.join(root, 'build', entry), 'utf-8')
  const deps = depseekSync(contents)
  for (const { value: file } of deps) {
    if (file.startsWith('.')) {
      entries.add(file)
      entries.add(file.replace(/\.c?js$/, '.d.ts'))
    }
  }
}

const whitelist = new Set([
  'name',
  'version',
  'description',
  'type',
  'main',
  'types',
  'typesVersions',
  'exports',
  'files',
  'engines',
  'optionalDependencies',
  'publishConfig',
  'keywords',
  'repository',
  'homepage',
  'author',
  'license',
])

const __pkgJson = Object.fromEntries(
  Object.entries(_pkgJson).filter(([k]) => whitelist.has(k))
)

const pkgJson = {
  ...__pkgJson,
  version: _pkgJson.version + '-lite',
  exports: {
    '.': {
      types: './build/core.d.ts',
      import: './build/core.js',
      require: './build/core.cjs',
      default: './build/core.js',
    },
    './package.json': './package.json',
  },
  main: './build/core.cjs',
  types: './build/core.d.ts',
  typesVersions: {
    '*': {
      '.': ['./build/core.d.ts'],
    },
  },
  files: [...files].map((f) => path.join('build', f)).sort(),
}

fs.writeFileSync(path.resolve(root, dest), JSON.stringify(pkgJson, null, 2))

console.log(`${dest} prepared for npm`)
