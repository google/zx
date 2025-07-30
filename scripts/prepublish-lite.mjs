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

// Prepares lite (core) version of zx to publish

import fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '..')
const pkgJsonFile = path.join(root, 'package.json')
const _pkgJson = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf-8'))

const pkgJson = {
  ..._pkgJson,
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
  man: undefined,
  files: [
    'build/3rd-party-licenses',
    'build/core.cjs',
    'build/core.js',
    'build/core.d.ts',
    'build/deno.js',
    'build/error.d.ts',
    'build/esblib.cjs',
    'build/log.d.ts',
    'build/util.cjs',
    'build/util.js',
    'build/util.d.ts',
    'build/vendor-core.cjs',
    'build/vendor-core.js',
    'build/vendor-core.d.ts',
  ],
}

fs.writeFileSync(pkgJsonFile, JSON.stringify(pkgJson, null, 2))

console.log('package.json prepared for zx-lite publishing')
