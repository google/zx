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
import '../build/globals.js'

const test = suite('win32')

$.verbose = false

if (process.platform === 'win32') {
  test('should work with windows-specific commands', async () => {
    const p = await $`echo $0` // Bash is first by default.
    assert.match(p.stdout, /bash/)
    await within(async () => {
      $.shell = which.sync('powershell.exe')
      $.quote = quotePowerShell
      const p = await $`get-host`
      assert.match(p.stdout, /PowerShell/)
    })
  })

  test('quotePowerShell works', async () => {
    await within(async () => {
      $.shell = which.sync('powershell.exe')
      $.quote = quotePowerShell
      const p = await $`echo ${`Windows 'rulez!'`}`
      assert.match(p.stdout, /Windows 'rulez!'/)
    })
  })
}

test.run()
