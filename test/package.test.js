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

import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

const pack = suite('package')

pack.before(async () => {
  $.verbose = false
  const pack = await $`npm pack`
  await $`tar xf ${pack}`
  await $`rm ${pack}`.nothrow()
  const fullPath = path.resolve('package')
  await $`mkdir -p /tmp/zx-pack-test`
  fs.writeFileSync(
    '/tmp/zx-pack-test/package.json',
    JSON.stringify({ private: true, dependencies: { zx: '*' } })
  )
  cd('/tmp/zx-pack-test')
  await $`npm i`
  await $`rm -rf /tmp/zx-pack-test/node_modules/zx`
  await $`mv ${fullPath} /tmp/zx-pack-test/node_modules/zx`
})

pack.after(async () => {
  await $`rm -rf /tmp/zx-pack-test`.nothrow()
})

pack('zx globals works', async () => {
  fs.writeFileSync('/tmp/zx-pack-test/script.mjs', 'await $`echo hello`')
  let out = await $`npx zx script.mjs`
  assert.match(out.toString(), 'hello')
})

pack('imports works', async () => {
  fs.writeFileSync(
    '/tmp/zx-pack-test/script.mjs',
    'import {$} from "zx"; await $`printf imported`'
  )
  let out = await $`node script.mjs`
  assert.match(out.toString(), 'imported')
})

pack.run()
