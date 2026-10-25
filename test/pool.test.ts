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
import { describe, test } from 'node:test'
import { $, pool } from '../src/index.ts'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('pool()', () => {
  test('fills a free slot without waiting for the rest of the batch', async () => {
    const gates = Array.from({ length: 4 }, () => deferred<number>())
    const started: number[] = []
    const third = deferred()
    const fourth = deferred()
    let pulled = 0
    function* tasks() {
      for (let i = 0; i < gates.length; i++) {
        pulled++
        yield () => {
          started.push(i)
          if (i === 2) third.resolve()
          if (i === 3) fourth.resolve()
          return gates[i].promise
        }
      }
    }
    const result = pool(2, tasks())
    assert.deepEqual(started, [0, 1])
    assert.equal(pulled, 2)
    gates[1].resolve(1)
    await third.promise
    assert.deepEqual(started, [0, 1, 2])
    assert.equal(pulled, 3)
    gates[2].resolve(2)
    await fourth.promise
    assert.deepEqual(started, [0, 1, 2, 3])
    gates[3].resolve(3)
    gates[0].resolve(0)
    assert.deepEqual(await result, [0, 1, 2, 3])
  })

  test('runs sequentially with one worker', async () => {
    const events: string[] = []
    const result = await pool(
      1,
      [0, 1, 2].map((i) => async () => {
        events.push(`start ${i}`)
        await Promise.resolve()
        events.push(`end ${i}`)
        return i
      })
    )
    assert.deepEqual(result, [0, 1, 2])
    assert.deepEqual(events, [
      'start 0',
      'end 0',
      'start 1',
      'end 1',
      'start 2',
      'end 2',
    ])
  })

  test('supports empty iterables and more workers than tasks', async () => {
    assert.deepEqual(await pool(2, []), [])
    assert.deepEqual(
      await pool(Number.MAX_SAFE_INTEGER, new Set([() => 42])),
      [42]
    )
  })

  test('accepts synchronous values, promises and thenables', async () => {
    assert.deepEqual(
      await pool(2, [
        () => 1,
        () => Promise.resolve(2),
        () => ({
          then(resolve: (n: number) => void) {
            resolve(3)
          },
        }),
      ]),
      [1, 2, 3]
    )
  })

  test('validates concurrency before consuming tasks', async () => {
    let consumed = false
    function* tasks() {
      consumed = true
      yield () => 1
    }
    for (const limit of [
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await assert.rejects(pool(limit, tasks()), /positive safe integer/)
    }
    assert.equal(consumed, false)
  })

  test('stops consuming tasks on failure and drains running tasks', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const error = new Error('first failure')
    let pulled = 0
    let closed = false
    function* tasks() {
      try {
        for (const task of [
          () => first.promise,
          () => second.promise,
          () => 3,
        ]) {
          pulled++
          yield task
        }
      } finally {
        closed = true
      }
    }
    const result = pool(2, tasks())
    let settled = false
    const rejection = assert.rejects(result, (err) => {
      settled = true
      assert.equal(err, error)
      return true
    })
    first.reject(error)
    // Allow the worker to observe the rejection without using a timer.
    await Promise.resolve()
    await Promise.resolve()
    assert.equal(pulled, 2)
    assert.equal(settled, false)
    second.reject(new Error('later failure'))
    await rejection
    assert.equal(pulled, 2)
    assert.equal(closed, true)
  })

  test('preserves synchronous throws, including undefined', async () => {
    let started = false
    const result = pool(2, [
      () => {
        throw undefined
      },
      () => {
        started = true
      },
    ])
    await assert.rejects(result, (err) => err === undefined)
    assert.equal(started, false)
  })

  test('preserves the first error if iterator cleanup also throws', async () => {
    const error = new Error('task failed')
    function* tasks() {
      try {
        yield () => {
          throw error
        }
      } finally {
        throw new Error('cleanup failed')
      }
    }
    await assert.rejects(pool(1, tasks()), (err) => err === error)
  })

  test('drains running work when the iterator throws', async () => {
    const gate = deferred<number>()
    const error = new Error('iterator failed')
    let finished = false
    function* tasks() {
      yield async () => {
        const value = await gate.promise
        finished = true
        return value
      }
      throw error
    }
    const result = pool(2, tasks())
    const rejection = assert.rejects(result, (err) => {
      assert.equal(finished, true)
      return err === error
    })
    gate.resolve(42)
    await rejection
  })

  test('handles failure after the iterator is exhausted', async () => {
    const gate = deferred()
    const error = new Error('late failure')
    const result = pool(3, [() => gate.promise])
    const rejection = assert.rejects(result, (err) => err === error)
    gate.reject(error)
    await rejection
  })

  test('runs ProcessPromise tasks and keeps their output order', async () => {
    const results = await pool(
      2,
      [0, 1, 2].map((i) => () => $`echo ${i}`.quiet())
    )
    assert.deepEqual(
      results.map((result) => result.stdout.trim()),
      ['0', '1', '2']
    )
  })

  test('is available in CLI scripts', async () => {
    const script =
      'console.log(JSON.stringify(await pool(2, [() => 1, async () => 2])))'
    const output = await $`node build/cli.js --eval ${script}`.quiet()
    assert.deepEqual(JSON.parse(output.stdout), [1, 2])
  })
})
