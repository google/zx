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
const deps = pkgJson.devDependencies

const jsrDeps = {
  yaml: 'jsr:@eemeli/yaml',
  zurk: 'jsr:@webpod/zurk',
}
const prodDeps = new Set([
  '@types/fs-extra',
  '@types/minimist',
  '@types/node',
  '@types/which',
  '@webpod/ingrid',
  '@webpod/ps',
  'chalk',
  'create-require',
  'depseek',
  'envapi',
  'fs-extra',
  'globby',
  'minimist',
  'node-fetch-native',
  'which',
  'yaml',
  'zurk',
])

fs.writeFileSync(
  path.resolve(root, 'jsr.json'),
  JSON.stringify(
    {
      name: '@webpod/zx',
      version: pkgJson.version,
      license: pkgJson.license,
      exports: {
        '.': './src/index.ts',
        './core': './src/core.ts',
        './cli': './src/cli.ts',
        './globals': './src/globals-jsr.ts',
      },
      publish: {
        include: ['src', 'README.md', 'LICENSE'],
        exclude: ['src/globals.ts'],
      },
      nodeModulesDir: 'auto',
      imports: Object.entries(deps).reduce(
        (m, [k, v]) => {
          if (prodDeps.has(k)) {
            const name = jsrDeps[k] || `npm:${k}`
            m[k] = `${name}@${v}`
          }
          return m
        },
        {
          'zurk/spawn': `jsr:@webpod/zurk@${deps.zurk}`,
          'zx/globals': './src/globals-jsr.ts',
        }
      ),
    },
    null,
    2
  )
)

console.log('jsr.json prepared for JSR')
