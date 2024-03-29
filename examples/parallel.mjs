#!/usr/bin/env zx

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

import { spinner } from 'zx'

const tests = await glob('test/*.test.js')
await spinner('running tests', async () => {
  try {
    const res = await Promise.all(tests.map((file) => $`npx uvu . ${file}`))
    res.forEach((r) => console.log(r.toString()))
    console.log(chalk.bgGreen.black(' SUCCESS '))
  } catch (e) {
    console.log(e.toString())
    process.exitCode = 1
  }
})
