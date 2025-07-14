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

import assert from 'node:assert'
import { test, describe } from 'node:test'
import process from 'node:process'
import '../../build/globals.js'

const _describe = process.platform === 'win32' ? describe : describe.skip

const _testPwsh = which.sync('pwsh', { nothrow: true }) ? test : test.skip

_describe('win32', () => {
  test('should work with windows-specific commands', async () => {
    const p = await $`echo $0` // Bash is first by default.
    assert.match(p.stdout, /bash/)

    await within(async () => {
      usePowerShell()
      assert.match($.shell, /powershell/i)
      const p = await $`get-host`
      assert.match(p.stdout, /PowerShell/)
    })
  })

  test('quotePowerShell works', async () => {
    await within(async () => {
      usePowerShell()
      const p = await $`echo ${`Windows 'rulez!'`}`
      assert.match(p.stdout, /Windows 'rulez!'/)
    })
  })

  _testPwsh('should work with pwsh when it is available', async () => {
    await within(async () => {
      usePwsh()
      assert.match($.shell, /pwsh/i)
      const p = await $`echo 'Hello,' && echo ${`new 'PowerShell'!`}`
      assert.match(p.stdout, /Hello,\s+new 'PowerShell'!/)
    })
  })

  test('should create a dir via mkdir', async () => {
    const temp = tmpdir()
    const _$ = $({ verbose: true, cwd: temp })

    console.log('shell:', $.shell)
    await _$`which bash`
    await _$`bash --version`

    await _$`mkdir -p ${path.join(temp, 'AA-zx-test')}`
    await _$`mkdir -p BB-zx-test`
    const { stdout } = await _$`ls -l | grep zx-test`

    assert.match(stdout, /AA-zx-test/)
    assert.match(stdout, /BB-zx-test/)
  })

  test('ps detects self process', async () => {
    const [root] = await ps.lookup({ pid: process.pid })
    assert.equal(root.pid, process.pid)
  })

  test('kill works', async () => {
    const p = $({ nothrow: true })`sleep 100`
    const { pid } = p
    const found = await ps.lookup({ pid })
    console.log('found:', found)
    assert.equal(found.length, 1)
    assert.equal(found[0].pid, pid)

    await p.kill()
    const killed = await ps.lookup({ pid })
    console.log('killed:', killed)
    assert.equal(killed.length, 0)
  })

  test('abort controller works', async () => {
    const ac = new AbortController()
    const { signal } = ac
    const p = $({
      signal,
      timeout: '5s',
      nothrow: true,
      killSignal: 'SIGKILL',
    })`sleep 10`

    setTimeout(async () => {
      assert.throws(
        () => p.abort('SIGINT'),
        /signal is controlled by another process/
      )
      setTimeout(() => {
        ac.abort('stop')
      }, 500)
    }, 500)

    const o = await p
    assert.equal(o.signal, 'SIGTERM')
    assert.throws(() => p.abort(), /Too late to abort the process/)
    assert.throws(() => p.kill(), /Too late to kill the process/)
  })
})
