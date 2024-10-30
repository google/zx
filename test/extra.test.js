// Copyright 2022 Google LLC
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
import { test, describe } from 'node:test'
import { globby, fs, path } from '../build/index.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

describe('extra', () => {
  test('every file should have a license', async () => {
    const copyright = await fs.readFile(
      path.resolve(__dirname, 'fixtures/copyright.txt'),
      'utf8'
    )
    const files = await globby(['**/*.{js,mjs,ts}', '!**/*polyfill.js'], {
      gitignore: true,
      onlyFiles: true,
      cwd: process.cwd(),
      followSymbolicLinks: false,
    })
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      assert(
        content.replace(/\d{4}/g, 'YEAR').includes(copyright),
        `No license header in ${file}.`
      )
    }
  })
})
