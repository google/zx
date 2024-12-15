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
const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '..')
const pkgJson = JSON.parse(
  fs.readFileSync(path.resolve(root, 'package.json'), 'utf-8')
)

fs.writeFileSync(
  path.resolve(root, 'jsr.json'),
  JSON.stringify(
    {
      name: '@zx/zx',
      version: pkgJson.version,
      exports: {
        '.': './src/index.ts',
        './core': './src/core.ts',
        './cli': './src/cli.ts',
      },
      publish: {
        include: ['src', 'README.md'],
      },
    },
    null,
    2
  )
)
