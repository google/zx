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
import { describe, before, after, it } from 'node:test'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '../../')

describe('jsr artifact', () => {
  let tmp
  let t$

  before(async () => {
    tmp = tempdir()
    t$ = $({ cwd: tmp, quiet: true })

    // copy all for jsr publish
    await Promise.all(
      [
        'src/',
        'tsconfig.json',
        'LICENSE',
        'scripts/build-jsr.mjs',
        'package.json',
      ].map((filepath) =>
        fs.copy(
          path.resolve(path.join(root, filepath)),
          path.resolve(path.join(tmp, filepath))
        )
      )
    )
    await t$`ln -s ${path.resolve(root, 'node_modules')} ${path.resolve(tmp, 'node_modules')}`
  })
  after(() => fs.remove(tmp))

  it('publish --dry-run`', async () => {
    await t$`node scripts/build-jsr.mjs`
    await t$({ quiet: false })`jsr publish --dry-run`
  })
})
