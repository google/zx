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

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parallel, ParallelPool } from '../src/parallel.js'
import type { ProgressEvent } from '../src/parallel.js'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('parallel()', () => {
  it('should execute tasks concurrently', async () => {
    const tasks = [
      () => delay(50).then(() => 'a'),
      () => delay(50).then(() => 'b'),
      () => delay(50).then(() => 'c'),
    ]

    const execution = await parallel(tasks, { concurrency: 3 })

    assert.strictEqual(execution.successCount, 3)
    assert.strictEqual(execution.failureCount, 0)
    assert.strictEqual(execution.results.length, 3)
    // Running concurrently should be faster than sequential (150ms)
    assert.ok(execution.totalDuration < 140)
  })

  it('should respect concurrency limit', async () => {
    let maxConcurrent = 0
    let currentConcurrent = 0

    const tasks = Array.from({ length: 6 }, () => async () => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await delay(30)
      currentConcurrent--
      return currentConcurrent
    })

    await parallel(tasks, { concurrency: 2 })

    assert.ok(maxConcurrent <= 2, `Max concurrent was ${maxConcurrent}, expected <= 2`)
  })

  it('should handle fail-fast mode', async () => {
    const executed: number[] = []

    const tasks = [
      async () => {
        executed.push(0)
        await delay(10)
        return 'ok'
      },
      async () => {
        executed.push(1)
        await delay(10)
        throw new Error('fail')
      },
      async () => {
        executed.push(2)
        await delay(50)
        return 'ok'
      },
    ]

    const execution = await parallel(tasks, { concurrency: 2, failFast: true })

    assert.ok(execution.failureCount >= 1)
    const rejected = execution.results.find((r) => r.status === 'rejected')
    assert.ok(rejected)
    assert.strictEqual(rejected.reason?.message, 'fail')
  })

  it('should handle fail-slow mode (continue on errors)', async () => {
    const tasks = [
      async () => 'a',
      async () => {
        throw new Error('fail-1')
      },
      async () => 'c',
      async () => {
        throw new Error('fail-2')
      },
      async () => 'e',
    ]

    const execution = await parallel(tasks, { concurrency: 2, failFast: false })

    assert.strictEqual(execution.results.length, 5)
    assert.strictEqual(execution.successCount, 3)
    assert.strictEqual(execution.failureCount, 2)
  })

  it('should report progress via callback', async () => {
    const events: ProgressEvent[] = []

    const tasks = [
      () => delay(10).then(() => 'a'),
      () => delay(20).then(() => 'b'),
      () => delay(30).then(() => 'c'),
    ]

    await parallel(tasks, {
      concurrency: 3,
      onProgress: (event) => events.push({ ...event }),
    })

    assert.ok(events.length > 0, 'Should have received progress events')
    const lastEvent = events[events.length - 1]
    assert.strictEqual(lastEvent.completed, 3)
    assert.strictEqual(lastEvent.failed, 0)
  })

  it('should support AbortController cancellation', async () => {
    const controller = new AbortController()

    const tasks = [
      async () => {
        await delay(10)
        return 'fast'
      },
      async () => {
        await delay(200)
        return 'slow'
      },
      async () => {
        await delay(200)
        return 'slow-2'
      },
    ]

    // Abort after 50ms
    setTimeout(() => controller.abort(), 50)

    const execution = await parallel(tasks, {
      concurrency: 3,
      signal: controller.signal,
    })

    // At least the fast task should have completed
    assert.ok(execution.results.length >= 1)
  })

  it('should throw if signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(
      () => parallel([async () => 'test'], { signal: controller.signal }),
      { message: 'Operation was aborted before execution started' }
    )
  })

  it('should handle per-task timeout', async () => {
    const tasks = [
      () => delay(10).then(() => 'fast'),
      () => delay(500).then(() => 'slow'),
    ]

    const execution = await parallel(tasks, { concurrency: 2, timeout: 50 })

    assert.strictEqual(execution.successCount, 1)
    assert.strictEqual(execution.failureCount, 1)

    const timedOut = execution.results.find((r) => r.status === 'rejected')
    assert.ok(timedOut)
    assert.ok(timedOut.reason?.message.includes('timed out'))
  })

  it('should aggregate results with timing info', async () => {
    const tasks = [
      () => delay(10).then(() => 1),
      () => delay(20).then(() => 2),
      () => delay(30).then(() => 3),
    ]

    const execution = await parallel(tasks, { concurrency: 3 })

    assert.strictEqual(execution.results.length, 3)
    assert.ok(execution.totalDuration > 0)

    for (const result of execution.results) {
      assert.ok(result.duration >= 0, 'Each result should have a duration')
      assert.strictEqual(result.status, 'fulfilled')
      assert.ok(typeof result.index === 'number')
      assert.ok(result.value !== undefined)
    }

    // Results should be sorted by index
    for (let i = 0; i < execution.results.length - 1; i++) {
      assert.ok(execution.results[i].index < execution.results[i + 1].index)
    }
  })
})

describe('ParallelPool', () => {
  it('should use default concurrency when not specified', async () => {
    const pool = new ParallelPool()
    const result = await pool.run([async () => 'test'])

    assert.strictEqual(result.successCount, 1)
    assert.strictEqual(result.results.length, 1)
  })

  it('should handle empty task list', async () => {
    const pool = new ParallelPool({ concurrency: 4 })
    const result = await pool.run([])

    assert.strictEqual(result.successCount, 0)
    assert.strictEqual(result.failureCount, 0)
    assert.strictEqual(result.results.length, 0)
    assert.ok(result.totalDuration >= 0)
  })
})
