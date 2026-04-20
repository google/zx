import { test } from 'node:test'
import assert from 'node:assert'
import { $, pool, within, quote } from '../src/index.ts'

test('pool() limits concurrency', async () => {
  await within(async () => {
    $.quote = quote
    $.shell = true

    console.log(' Running concurrency test...')
    const start = Date.now()
    const duration = 1000

    await pool(2, [
      () => $`node -e "setTimeout(() => {}, ${duration})"`,
      () => $`node -e "setTimeout(() => {}, ${duration})"`,
      () => $`node -e "setTimeout(() => {}, ${duration})"`,
      () => $`node -e "setTimeout(() => {}, ${duration})"`,
    ])

    const totalDuration = Date.now() - start
    console.log(`Total time: ${totalDuration}ms`)

    assert.ok(totalDuration >= 2000, `Too fast! Got ${totalDuration}ms`)
    assert.ok(totalDuration < 3500, `Too slow! Got ${totalDuration}ms`)
  })
})
