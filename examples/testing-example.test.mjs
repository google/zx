#!/usr/bin/env node
/**
 * Complete Test Suite Example for zx Scripts
 * 
 * This demonstrates a complete test suite using node:test
 * Run with: node examples/testing-example.test.mjs
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { $, within } from 'zx'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { getGitBranch, deploy, createMockSpawn } from './testing-example.mjs'

describe('Testing zx Scripts', () => {
  const originalSpawn = $.spawn

  after(() => {
    $.spawn = originalSpawn
  })

  describe('getGitBranch()', () => {
    test('returns current git branch', async () => {
      await within(async () => {
        $.spawn = createMockSpawn({
          'git branch --show-current': { stdout: 'main\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current': { stdout: 'main\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current ': { stdout: 'main\n', exitCode: 0 },
        })

        const branch = await getGitBranch()
        assert.equal(branch, 'main')
      })
    })

    test('handles different branches', async () => {
      await within(async () => {
        $.spawn = createMockSpawn({
          'git branch --show-current': { stdout: 'feature/xyz\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current': { stdout: 'feature/xyz\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current ': { stdout: 'feature/xyz\n', exitCode: 0 },
        })

        const branch = await getGitBranch()
        assert.equal(branch, 'feature/xyz')
      })
    })
  })

  describe('deploy()', () => {
    test('deploys current branch by default', async () => {
      await within(async () => {
        $.spawn = createMockSpawn({
          'git branch --show-current': { stdout: 'main\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current': { stdout: 'main\n', exitCode: 0 },
          'set -euo pipefail;git branch --show-current ': { stdout: 'main\n', exitCode: 0 },
        })

        const result = await deploy()
        assert.equal(result.branch, 'main')
        assert.equal(result.success, true)
      })
    })

    test('deploys specified branch', async () => {
      const result = await deploy('feature-branch')
      assert.equal(result.branch, 'feature-branch')
      assert.equal(result.success, true)
    })
  })

  describe('Custom spawn function', () => {
    test('can mock individual commands', async () => {
      await within(async () => {
        const mockSpawn = createMockSpawn({
          'echo hello': { stdout: 'hello\n', exitCode: 0 },
          'set -euo pipefail;echo hello': { stdout: 'hello\n', exitCode: 0 },
          'set -euo pipefail;echo hello ': { stdout: 'hello\n', exitCode: 0 },
        })

        const result = await $({ spawn: mockSpawn })`echo hello`
        assert.equal(result.stdout.trim(), 'hello')
        assert.equal(result.exitCode, 0)
      })
    })

    test('handles command errors', async () => {
      await within(async () => {
        const mockSpawn = createMockSpawn({
          'exit 1': { stderr: 'Error occurred\n', exitCode: 1 },
          'set -euo pipefail;exit 1': { stderr: 'Error occurred\n', exitCode: 1 },
          'set -euo pipefail;exit 1 ': { stderr: 'Error occurred\n', exitCode: 1 },
        })

        const result = await $({ spawn: mockSpawn, nothrow: true })`exit 1`
        assert.equal(result.exitCode, 1)
        assert.equal(result.ok, false)
        assert.match(result.stderr, /Error occurred/)
      })
    })
  })

  describe('Integration testing', () => {
    test('can test with real commands', async () => {
      // This test uses real commands - only run if git is available
      const result = await $`echo "test"`.nothrow()
      assert.equal(result.exitCode, 0)
      assert.match(result.stdout, /test/)
    })
  })

  describe('Context isolation with within()', () => {
    test('isolates spawn mocks', async () => {
      await within(async () => {
        $.spawn = createMockSpawn({
          'echo test1': { stdout: 'test1\n', exitCode: 0 },
          'set -euo pipefail;echo test1': { stdout: 'test1\n', exitCode: 0 },
          'set -euo pipefail;echo test1 ': { stdout: 'test1\n', exitCode: 0 },
        })

        const result = await $`echo test1`
        assert.equal(result.stdout.trim(), 'test1')
      })

      // After within(), original spawn is restored
      // This would fail if spawn wasn't restored
      const result = await $`echo "real command"`.nothrow()
      assert.equal(result.exitCode, 0)
    })
  })
})

