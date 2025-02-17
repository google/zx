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

import assert from 'assert'
import 'zx/globals'
;(async () => {
  // smoke test
  {
    const p = await $`echo foo`
    assert.match(p.stdout, /foo/)
    assert.deepEqual(p.lines(), ['foo'])
  }

  // captures err stack
  {
    const p = await $({ nothrow: true })`echo foo; exit 3`
    assert.match(p.message, /exit code: 3/)
  }

  // ctx isolation
  {
    await within(async () => {
      const t1 = tmpdir()
      const t3 = tmpdir()
      $.cwd = t1
      assert.equal($.cwd, t1)
      assert.equal($.cwd, t1)

      const w = within(async () => {
        const t3 = tmpdir()
        $.cwd = t3
        assert.equal($.cwd, t3)

        assert.ok((await $`pwd`).toString().trim().endsWith(t3))
        assert.equal($.cwd, t3)
      })

      await $`pwd`
      assert.ok((await $`pwd`).toString().trim().endsWith(t1))
      assert.equal($.cwd, t1)
      assert.ok((await $`pwd`).toString().trim().endsWith(t1))

      $.cwd = t3
      assert.ok((await $`pwd`).toString().trim().endsWith(t3))
      assert.equal($.cwd, t3)

      await w
    })
  }
})()

console.log('smoke mjs: ok')
