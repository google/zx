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

import assert from 'node:assert'
import { tempdir, $, path, fs } from '../../build/index.js'
import { describe, before, after, it } from 'node:test'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '../../')

describe('package.json artifact', () => {
  let tmp
  let t$

  before(async () => {
    tmp = tempdir()
    t$ = $({ cwd: tmp, quiet: true })

    await fs.copy(
      path.resolve(root, 'package.json'),
      path.resolve(tmp, 'package.json')
    )
    await fs.copy(
      path.resolve(root, 'scripts/clean-package-json.mjs'),
      path.resolve(tmp, 'scripts/clean-package-json.mjs')
    )
  })

  after(() => fs.remove(tmp))

  it('handle exist properties required for publishing', async () => {
    await t$`node scripts/clean-package-json.mjs`
    // to throw if manifest is not correct
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(tmp, 'package.json'))
    )

    assert.equal(pkgJson.name, 'zx')
    assert.equal(pkgJson.description, 'A tool for writing better scripts')
    assert.equal(pkgJson.prettier, undefined)
    assert.equal(pkgJson.scripts, undefined)
    assert.equal(pkgJson.volta, undefined)
  })
})
