#!/usr/bin/env zx
/**
 * Example: Testing zx Scripts
 * 
 * This example demonstrates how to test zx scripts by:
 * 1. Extracting logic into testable functions
 * 2. Using custom spawn functions for mocking
 */

import { $ } from 'zx'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

// Example script function that we want to test
export async function getGitBranch() {
  const result = await $`git branch --show-current`
  return result.stdout.trim()
}

export async function deploy(branch) {
  const targetBranch = branch || await getGitBranch()
  console.log(`Deploying branch: ${targetBranch}`)
  // In a real script, you would do: await $`dep deploy --branch=${targetBranch}`
  return { branch: targetBranch, success: true }
}

// Example test helper for mocking commands
export function createMockSpawn(commandMap) {
  return (command, args, options) => {
    const proc = new EventEmitter()
    // Use PassThrough streams which are proper Node.js streams
    proc.stdout = new PassThrough()
    proc.stderr = new PassThrough()
    proc.stdin = new PassThrough()
    proc.pid = Math.floor(Math.random() * 10000)
    
    // When using shell mode, command is the shell and args[0] is the full command
    // zx adds prefixes like "set -euo pipefail;" - extract the actual command
    const fullCmd = args && args.length > 0 ? args[0] : `${command} ${(args || []).join(' ')}`
    
    // Try to find handler by matching the command part (after any prefix)
    let handler = commandMap[fullCmd]
    if (!handler) {
      // Extract command after prefix (e.g., "set -euo pipefail;git branch --show-current" -> "git branch --show-current")
      const cmdMatch = fullCmd.match(/[^;]*;\s*(.+)$/) || [null, fullCmd]
      const actualCmd = cmdMatch[1] || fullCmd
      handler = commandMap[actualCmd]
    }
    
    if (handler) {
      setTimeout(() => {
        if (typeof handler === 'function') {
          handler(proc)
        } else {
          const { stdout = '', stderr = '', exitCode = 0 } = handler
          if (stdout) proc.stdout.push(Buffer.from(stdout))
          if (stderr) proc.stderr.push(Buffer.from(stderr))
          proc.stdout.push(null) // End the stream
          proc.stderr.push(null) // End the stream
          proc.emit('close', exitCode)
        }
      }, 10)
    } else {
      setTimeout(() => {
        proc.stderr.push(Buffer.from(`command not found: ${fullCmd}\n`))
        proc.stderr.push(null)
        proc.emit('close', 127)
      }, 10)
    }
    
    return proc
  }
}

// Example test function
export async function testDeploy() {
  const originalSpawn = $.spawn
  
  try {
    // Mock git command - match both with and without prefix
    $.spawn = createMockSpawn({
      'git branch --show-current': { stdout: 'main\n', exitCode: 0 },
      'set -euo pipefail;git branch --show-current': { stdout: 'main\n', exitCode: 0 },
      'set -euo pipefail;git branch --show-current ': { stdout: 'main\n', exitCode: 0 },
    })
    
    const result = await deploy()
    console.log('Test result:', result)
    console.log('✓ Test passed: deploy() works with mocked git command')
    
    // Test with explicit branch
    const result2 = await deploy('feature-branch')
    console.log('Test result 2:', result2)
    console.log('✓ Test passed: deploy() works with explicit branch')
    
  } finally {
    $.spawn = originalSpawn
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await testDeploy()
}

