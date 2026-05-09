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

/**
 * Parallel command orchestration for zx.
 * Provides concurrent command execution with configurable limits.
 */

import os from 'node:os'

export interface ParallelOptions {
  concurrency?: number
  failFast?: boolean
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  timeout?: number
}

export interface ProgressEvent {
  completed: number
  total: number
  running: number
  failed: number
  results: ParallelResult[]
}

export interface ParallelResult<T = unknown> {
  index: number
  status: 'fulfilled' | 'rejected'
  value?: T
  reason?: Error
  duration: number
}

export interface ParallelExecution<T> {
  results: ParallelResult<T>[]
  totalDuration: number
  successCount: number
  failureCount: number
}

/**
 * Execute tasks concurrently with configurable concurrency limits.
 *
 * @param tasks - Array of functions returning promises
 * @param options - Concurrency and execution options
 * @returns Aggregated results with timing information
 */
export async function parallel<T>(
  tasks: (() => Promise<T>)[],
  options: ParallelOptions = {}
): Promise<ParallelExecution<T>> {
  const pool = new ParallelPool<T>(options)
  return pool.run(tasks)
}

/**
 * Manages a concurrency pool using a semaphore pattern.
 * Handles task scheduling, cancellation, progress reporting, and result aggregation.
 */
export class ParallelPool<T> {
  private readonly concurrency: number
  private readonly failFast: boolean
  private readonly signal?: AbortSignal
  private readonly onProgress?: (event: ProgressEvent) => void
  private readonly timeout?: number

  private running = 0
  private completed = 0
  private failed = 0
  private abortController: AbortController | null = null
  private results: ParallelResult<T>[] = []
  private queue: Array<{ task: () => Promise<T>; index: number }> = []
  private resolveQueue: (() => void) | null = null

  constructor(options: ParallelOptions = {}) {
    this.concurrency = options.concurrency ?? Math.min(os.cpus().length, 4)
    this.failFast = options.failFast ?? false
    this.signal = options.signal
    this.onProgress = options.onProgress
    this.timeout = options.timeout
  }

  /**
   * Run all tasks with concurrency control.
   */
  async run(tasks: (() => Promise<T>)[]): Promise<ParallelExecution<T>> {
    const startTime = Date.now()
    this.results = []
    this.completed = 0
    this.failed = 0
    this.running = 0
    this.abortController = new AbortController()

    // Wire up external abort signal to internal controller
    const onExternalAbort = () => this.abortController?.abort()
    if (this.signal) {
      if (this.signal.aborted) {
        throw new Error('Operation was aborted before execution started')
      }
      this.signal.addEventListener('abort', onExternalAbort)
    }

    try {
      // Populate the queue
      this.queue = tasks.map((task, index) => ({ task, index }))

      // Spawn workers up to the concurrency limit
      const workers: Promise<void>[] = []
      const workerCount = Math.min(this.concurrency, tasks.length)
      for (let i = 0; i < workerCount; i++) {
        workers.push(this.worker())
      }

      await Promise.all(workers)

      const totalDuration = Date.now() - startTime
      const successCount = this.results.filter(
        (r) => r.status === 'fulfilled'
      ).length
      const failureCount = this.results.filter(
        (r) => r.status === 'rejected'
      ).length

      // Sort results by original index
      this.results.sort((a, b) => a.index - b.index)

      return {
        results: this.results,
        totalDuration,
        successCount,
        failureCount,
      }
    } finally {
      // Bug-fix: Clean up AbortController listeners to prevent memory leaks
      if (this.signal) {
        this.signal.removeEventListener('abort', onExternalAbort)
      }
      this.abortController = null
      this.queue = []
      this.resolveQueue = null
    }
  }

  /**
   * Worker loop that pulls tasks from the queue and executes them.
   */
  private async worker(): Promise<void> {
    while (this.queue.length > 0) {
      if (this.abortController?.signal.aborted) {
        break
      }

      const item = this.queue.shift()
      if (!item) break

      this.running++
      const result = await this.executeTask(item.task, item.index)
      this.running--
      this.completed++

      if (result.status === 'rejected') {
        this.failed++
      }

      this.results.push(result)
      this.reportProgress(this.completed + this.queue.length + this.running)

      // In fail-fast mode, abort remaining tasks on first failure
      if (this.failFast && result.status === 'rejected') {
        this.abortController?.abort()
        this.queue = []
        break
      }
    }
  }

  /**
   * Execute a single task with optional timeout and abort support.
   */
  private async executeTask(
    task: () => Promise<T>,
    index: number
  ): Promise<ParallelResult<T>> {
    const taskStart = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      if (this.abortController?.signal.aborted) {
        return {
          index,
          status: 'rejected',
          reason: new Error('Task aborted'),
          duration: Date.now() - taskStart,
        }
      }

      const taskPromise = task()

      let result: T
      if (this.timeout != null && this.timeout > 0) {
        result = await Promise.race([
          taskPromise,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error(`Task ${index} timed out after ${this.timeout}ms`)),
              this.timeout!
            )
          }),
        ])
      } else {
        result = await taskPromise
      }

      return {
        index,
        status: 'fulfilled',
        value: result,
        duration: Date.now() - taskStart,
      }
    } catch (err) {
      return {
        index,
        status: 'rejected',
        reason: err instanceof Error ? err : new Error(String(err)),
        duration: Date.now() - taskStart,
      }
    } finally {
      // Bug-fix: Clear timeout to prevent leaked timers
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Report progress to the callback if provided.
   */
  private reportProgress(total: number): void {
    if (!this.onProgress) return

    this.onProgress({
      completed: this.completed,
      total,
      running: this.running,
      failed: this.failed,
      results: [...this.results],
    })
  }
}
