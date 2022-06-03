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

import { test } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

$.verbose = false

test('package works', async () => {
  let pack
  try {
    await $`mkdir -p /tmp/zx-pack-test/node_modules`
    pack = await $`npm pack`
    await $`tar xf ${pack}`
    await $`rm ${pack}`.nothrow()
    await $`mv package/ /tmp/zx-pack-test/node_modules/zx`
    let packageJSON = {private: true, dependencies: {zx: '*'}}
    fs.writeFileSync('/tmp/zx-pack-test/package.json', JSON.stringify(packageJSON))
    fs.writeFileSync('/tmp/zx-pack-test/script.mjs', 'await $`echo hello`')
    cd('/tmp/zx-pack-test')
    let out = await $`npx zx script.mjs`
    assert.match(out.toString(), 'hello')
  } finally {
    await $`rm -rf /tmp/zx-pack-test`.nothrow()
  }
})

test.run()
