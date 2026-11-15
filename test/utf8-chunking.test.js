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

import assert from 'node:assert'
import { test, describe } from 'node:test'
import { bufArrJoin, getLines } from '../build/util.cjs'
import { $, usePowerShell } from '../build/index.js'

if (process.platform === 'win32') {
  usePowerShell()
}

describe('UTF-8 chunk boundary decoding (#1554)', () => {
  test('bufArrJoin correctly decodes multi-byte UTF-8 split across chunks', () => {
    // 2-byte ('é': 0xc3 0xa9), 3-byte ('日': 0xe6 0x97 0xa5), 4-byte ('🔥': 0xf0 0x9f 0x94 0xa5)
    const raw = Buffer.from('Café 日本 🔥\n')

    // Split right inside the 3-byte '日' sequence (between byte 1 and byte 2)
    const i = raw.indexOf(0xe6) + 1
    const chunk1 = raw.subarray(0, i)
    const chunk2 = raw.subarray(i)

    const joined = bufArrJoin([chunk1, chunk2])
    assert.strictEqual(joined, 'Café 日本 🔥\n')
    assert.strictEqual(joined.includes('\uFFFD'), false)
  })

  test('bufArrJoin correctly decodes 4-byte UTF-8 split across multiple chunks', () => {
    const raw = Buffer.from('Start 🔥 End')
    const fireIndex = raw.indexOf(0xf0)

    // Split 4-byte emoji into 3 separate chunks
    const chunk1 = raw.subarray(0, fireIndex + 1) // includes 0xf0
    const chunk2 = raw.subarray(fireIndex + 1, fireIndex + 3) // includes 0x9f, 0x94
    const chunk3 = raw.subarray(fireIndex + 3) // includes 0xa5 and remainder

    const joined = bufArrJoin([chunk1, chunk2, chunk3])
    assert.strictEqual(joined, 'Start 🔥 End')
    assert.strictEqual(joined.includes('\uFFFD'), false)
  })

  test('bufArrJoin handles mix of strings and split Buffers', () => {
    const raw = Buffer.from('日本語')
    const chunk1 = raw.subarray(0, 2) // partial '日'
    const chunk2 = raw.subarray(2) // remainder of '日' and '本語'

    const joined = bufArrJoin(['Prefix: ', chunk1, chunk2, ' :Suffix'])
    assert.strictEqual(joined, 'Prefix: 日本語 :Suffix')
    assert.strictEqual(joined.includes('\uFFFD'), false)
  })

  test('getLines preserves multi-byte UTF-8 characters split across chunks', () => {
    const raw = Buffer.from('Line 1: Café 日本\nLine 2: 🔥 Test\n')
    const splitIndex = raw.indexOf(0xe6) + 1
    const chunk1 = raw.subarray(0, splitIndex)
    const chunk2 = raw.subarray(splitIndex)

    const memo = []
    const lines = []
    lines.push(...getLines(chunk1, memo, /\r?\n/))
    lines.push(...getLines(chunk2, memo, /\r?\n/))
    const rest = (memo[0] || '') + (memo.decoder?.decode() || '')
    if (rest) lines.push(rest)

    assert.deepStrictEqual(lines, ['Line 1: Café 日本', 'Line 2: 🔥 Test'])
    assert.strictEqual(lines.join('').includes('\uFFFD'), false)
  })

  test('process stdout, lines(), and async iterator decode split UTF-8 cleanly', async () => {
    $.verbose = false

    const code = `
      const b = Buffer.from("Café 日本\\n");
      const i = b.indexOf(0xe6) + 1;
      process.stdout.write(b.subarray(0, i));
      setTimeout(() => {
        process.stdout.write(b.subarray(i));
      }, 30);
    `
    const b64 = Buffer.from(code).toString('base64')
    const runner = `eval(Buffer.from('${b64}', 'base64').toString('utf8'))`

    const p = await $`node -e ${runner}`
    assert.strictEqual(p.stdout, 'Café 日本\n')
    assert.strictEqual(p.stdout.includes('\uFFFD'), false)
    assert.deepStrictEqual(p.lines(), ['Café 日本'])

    const iterated = []
    for await (const line of $`node -e ${runner}`) {
      iterated.push(line)
    }
    assert.deepStrictEqual(iterated, ['Café 日本'])
  })

  test('process json() and large stdout (>64 KiB pipe buffer) have no replacement chars', async () => {
    $.verbose = false

    // 30,000 * 3 = 90,000 bytes, which crosses the 65,536-byte pipe chunk boundary at 65536 % 3 === 1
    const code = `
      process.stdout.write(JSON.stringify({ s: "日".repeat(30000) }));
    `
    const b64 = Buffer.from(code).toString('base64')
    const runner = `eval(Buffer.from('${b64}', 'base64').toString('utf8'))`

    const p = await $`node -e ${runner}`
    assert.strictEqual(p.stdout.includes('\uFFFD'), false)
    const data = p.json()
    assert.strictEqual(data.s.length, 30000)
    assert.strictEqual(data.s.includes('\uFFFD'), false)
  })
})
