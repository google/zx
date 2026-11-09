// Copyright 2026 Google LLC
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

const assert = require('assert')
const { app } = require('electron')

const smoke = async ({ $ }) => {
  assert.match((await $`echo foo`).stdout, /foo/)
  assert.equal((await $({ nothrow: true })`exit 3`).exitCode, 3)
  const p = await $({ timeout: '100ms', nothrow: true })`sleep 5`
  assert.equal(p.signal, 'SIGTERM')
}

app
  .whenReady()
  .then(async () => {
    assert.equal(process.type, 'browser')
    await smoke(require('zx'))
    if (parseInt(process.versions.electron) >= 28)
      await smoke(await import('zx'))
    console.log('smoke electron: ok')
  })
  .then(
    () => app.exit(0),
    (e) => {
      console.error(e)
      app.exit(1)
    }
  )
