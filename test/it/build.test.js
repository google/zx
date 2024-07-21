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

import { tempdir, $, path, fs } from '../../build/index.js'
import assert from 'node:assert'
import { describe, before, after, it } from 'node:test'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '../../')

describe('npm artifact', () => {
  let tmp
  let zxdir
  let t$

  const pkgJson = {
    name: 'zx-test',
    dependencies: {
      typescript: '^5',
      '@types/node': '*',
      '@types/fs-extra': '*',
    },
  }

  before(async () => {
    tmp = tempdir()
    t$ = $({ cwd: tmp, quiet: true })
    zxdir = path.resolve(tmp, 'node_modules/zx')

    await fs.outputJSON(path.resolve(tmp, 'package.json'), pkgJson)
    await t$`npm i`
    // `file:<path>` dep mounts `node_modules` too, so we use cloning here
    await fs.copy(
      path.resolve(root, 'package.json'),
      path.resolve(zxdir, 'package.json')
    )
    await fs.copy(path.resolve(root, 'build'), path.resolve(zxdir, 'build'))
  })

  after(() => fs.remove(tmp))

  it('looks buildable with tsc', async () => {
    const indexTs = `import {$} from 'zx'
(async () => {
  await $({verbose: true, stdio: 'pipe'})\`echo hello\`
})()
`
    const tsconfig = {
      compilerOptions: {
        module: 'commonjs',
        target: 'esnext',
        outDir: 'build-tsc',
        rootDir: 'src',
        declaration: true,
        declarationMap: false,
        esModuleInterop: true,
      },
      include: ['src'],
    }

    await fs.outputJSON(path.resolve(tmp, 'tsconfig.json'), tsconfig)
    await fs.outputFile(path.resolve(tmp, 'src/index.ts'), indexTs)
    await t$`tsc`
    const result = await t$`node build-tsc/index.js`.text()

    assert.strictEqual(result, '$ echo hello\nhello\n')
  })
})
