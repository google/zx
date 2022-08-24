// Copyright 2021 Google LLC
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
import { deps, $ } from '../build/index.js'

const test = suite('deps')

$.verbose = false

test('deps() loader works', async () => {
  let out =
    await $`node build/cli.js <<< 'await deps({ lodash: "4.17.21" }, { registry: "https://registry.yarnpkg.com/" }); console.log(require("lodash").VERSION)'`
  assert.match(out.stdout, '4.17.21')

  const { 'lodash-es': lodash, cpy: {default: cpy} } = await deps({ 'lodash-es': '4.17.21', cpy: '9.0.1' }, {registry: 'https://registry.yarnpkg.com/'})

  assert.instance(cpy, Function)
  assert.instance(lodash.pick, Function)
})

test.run()
