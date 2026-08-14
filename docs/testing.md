# Testing zx Scripts

This guide covers different approaches to testing zx scripts, from simple integration tests to advanced mocking strategies.

## Table of Contents

- [Basic Testing Approaches](#basic-testing-approaches)
- [Mocking `$.spawn`](#mocking-spawn)
- [Using Custom Spawn Functions](#using-custom-spawn-functions)
- [Isolating Context with `within()`](#isolating-context-with-within)
- [Testing Script Files](#testing-script-files)
- [Best Practices](#best-practices)

## Basic Testing Approaches

> **Example**: See [`examples/testing-example.mjs`](https://github.com/google/zx/blob/main/examples/testing-example.mjs) for a working example.

### 1. Extract Logic to Testable Functions

The simplest approach is to extract your business logic into testable functions:

```js
// script.mjs
import { $ } from 'zx'

export async function deploy(branch) {
  const currentBranch = await $`git branch --show-current`
  await $`dep deploy --branch=${branch || currentBranch}`
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await deploy()
}
```

```js
// script.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'
import { deploy } from './script.mjs'

test('deploy function', async () => {
  // Mock git command
  const originalSpawn = $.spawn
  const { PassThrough } = await import('node:stream')
  
  $.spawn = (command, args) => {
    // Return a mock process that resolves with the branch name
    const proc = new EventEmitter()
    proc.stdout = new PassThrough()
    proc.stderr = new PassThrough()
    proc.stdin = new PassThrough()
    proc.pid = 12345
    
    setTimeout(() => {
      proc.stdout.push(Buffer.from('main\n'))
      proc.stdout.push(null) // End the stream
      proc.emit('close', 0)
    }, 10)
    return proc
  }
  
  try {
    await deploy('feature-branch')
  } finally {
    $.spawn = originalSpawn
  }
})
```

### 2. Integration Testing with Real Commands

For integration tests, you can run your scripts directly:

```js
// test/integration.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'

test('script runs successfully', async () => {
  const result = await $`node script.mjs`.nothrow()
  assert.equal(result.exitCode, 0)
  assert.match(result.stdout, /expected output/)
})
```

## Mocking `$.spawn`

You can mock `$.spawn` globally to intercept all process creation. This is useful for unit testing:

```js
// test/unit.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'

describe('my script', () => {
  const originalSpawn = $.spawn

  before(() => {
    $.spawn = (...args) => {
      const proc = spawn(...args)
      // Track processes for cleanup
      const done = () => (proc._done = true)
      proc.once('close', done).once('error', done)
      return proc
    }
  })

  after(() => {
    $.spawn = originalSpawn
  })

  test('command execution', async () => {
    const result = await $`echo hello`
    assert.equal(result.stdout.trim(), 'hello')
  })
})
```

## Using Custom Spawn Functions

For more control, you can pass a custom `spawn` function directly to `$()`:

```js
// test/unit.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

test('mocked command', async () => {
  const mockSpawn = (command, args, options) => {
    const proc = new EventEmitter()
    // Use PassThrough streams which are proper Node.js streams
    proc.stdout = new PassThrough()
    proc.stderr = new PassThrough()
    proc.stdin = new PassThrough()
    proc.pid = 12345
    
    // When using shell mode, args[0] contains the full command (may include prefix)
    const fullCmd = args && args.length > 0 ? args[0] : `${command} ${(args || []).join(' ')}`
    
    // Simulate command execution
    setTimeout(() => {
      // Extract command after prefix (e.g., "set -euo pipefail;echo hello" -> "echo hello")
      const cmdMatch = fullCmd.match(/[^;]*;\s*(.+)$/) || [null, fullCmd]
      const actualCmd = cmdMatch[1] || fullCmd
      
      if (actualCmd.includes('echo hello')) {
        proc.stdout.push(Buffer.from('hello\n'))
        proc.stdout.push(null) // End the stream
        proc.emit('close', 0)
      } else {
        proc.stderr.push(Buffer.from('command not found\n'))
        proc.stderr.push(null)
        proc.emit('close', 1)
      }
    }, 10)
    
    return proc
  }

  const result = await $({ spawn: mockSpawn })`echo hello`
  assert.equal(result.stdout.trim(), 'hello')
  assert.equal(result.exitCode, 0)
})
```

### Advanced Mocking Example

Here's a more sophisticated mock that can handle different commands:

```js
// test/mock-helpers.mjs
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

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

// Usage
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'
import { createMockSpawn } from './mock-helpers.mjs'

test('complex script', async () => {
  const mockSpawn = createMockSpawn({
    'git branch --show-current': { stdout: 'main\n', exitCode: 0 },
    'git status': { stdout: 'On branch main\n', exitCode: 0 },
    'npm test': { stdout: 'Tests passed\n', exitCode: 0 },
  })

  const result = await $({ spawn: mockSpawn })`git branch --show-current`
  assert.equal(result.stdout.trim(), 'main')
})
```

## Isolating Context with `within()`

The `within()` function creates an isolated context for testing, ensuring that changes to `$` configuration don't leak between tests:

```js
// test/isolated.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $, within } from 'zx'

test('isolated context', async () => {
  await within(async () => {
    $.verbose = true
    $.cwd = '/tmp'
    
    // Your test code here
    const result = await $`pwd`
    assert.ok(result.stdout.includes('/tmp'))
  })
  
  // $.verbose and $.cwd are restored after within()
  assert.equal($.verbose, false)
})
```

## Testing Script Files

You can test entire script files by executing them with the zx CLI:

```js
// test/script-file.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'

test('script file execution', async () => {
  const result = await $`node build/cli.js script.mjs`.nothrow()
  assert.equal(result.exitCode, 0)
  assert.match(result.stdout, /expected output/)
})
```

For testing scripts with `--eval`:

```js
// test/eval.test.mjs
import { test } from 'node:test'
import assert from 'node:assert'
import { $ } from 'zx'

function zx(script) {
  return $`node build/cli.js --eval ${script}`.nothrow().timeout('5s')
}

test('eval script', async () => {
  const result = await zx(`
    await $\`echo hello\`
  `)
  assert.match(result.stdout, /hello/)
})
```

## Best Practices

### 1. Use `nothrow()` for Error Testing

When testing error conditions, use `.nothrow()` to prevent unhandled promise rejections:

```js
test('handles errors gracefully', async () => {
  const result = await $`nonexistent-command`.nothrow()
  assert.equal(result.exitCode, 127) // Command not found
  assert.equal(result.ok, false)
})
```

### 2. Clean Up After Tests

Always restore original functions in `after` hooks:

```js
import { before, after } from 'node:test'

const originalSpawn = $.spawn

before(() => {
  $.spawn = mockSpawn
})

after(() => {
  $.spawn = originalSpawn
})
```

### 3. Test in Isolation

Use `within()` to ensure tests don't interfere with each other:

```js
test('test 1', async () => {
  await within(async () => {
    $.verbose = true
    // test code
  })
})

test('test 2', async () => {
  await within(async () => {
    $.verbose = false
    // test code
  })
})
```

### 4. Combine Approaches

For complex scripts, combine multiple approaches:

```js
// Extract testable logic
export async function deploy(branch) {
  const currentBranch = await $`git branch --show-current`
  await $`dep deploy --branch=${branch || currentBranch}`
}

// Test with mocks
test('deploy with mock', async () => {
  await within(async () => {
    $.spawn = createMockSpawn({
      'git branch --show-current': { stdout: 'main\n' },
      'dep deploy --branch=main': { stdout: 'Deployed\n', exitCode: 0 },
    })
    
    await deploy()
  })
})

// Integration test with real commands
test('deploy integration', async () => {
  // Use a test branch
  await deploy('test-branch')
})
```

### 5. Mock Helper Pattern

Create reusable mock helpers:

```js
// test-helpers.mjs
export function withMockSpawn(mockSpawn, testFn) {
  return async () => {
    const original = $.spawn
    $.spawn = mockSpawn
    try {
      await testFn()
    } finally {
      $.spawn = original
    }
  }
}

// Usage
test('my test', withMockSpawn(mockSpawn, async () => {
  const result = await $`echo test`
  assert.equal(result.stdout.trim(), 'test')
}))
```

## Example: Complete Test Suite

> **Working Examples**: See [`examples/testing-example.mjs`](https://github.com/google/zx/blob/main/examples/testing-example.mjs) and [`examples/testing-example.test.mjs`](https://github.com/google/zx/blob/main/examples/testing-example.test.mjs) for complete, working examples.

Here's a complete example of testing a zx script:

```js
// deploy.mjs
#!/usr/bin/env zx

export async function deploy(branch) {
  const currentBranch = await $`git branch --show-current`
  const targetBranch = branch || currentBranch.trim()
  
  console.log(`Deploying branch: ${targetBranch}`)
  await $`dep deploy --branch=${targetBranch}`
  
  return { branch: targetBranch, success: true }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await deploy()
}
```

```js
// deploy.test.mjs
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { $, within } from 'zx'
import { deploy } from './deploy.mjs'
import { createMockSpawn } from './test-helpers.mjs'

describe('deploy', () => {
  const originalSpawn = $.spawn

  before(() => {
    $.spawn = createMockSpawn({
      'git branch --show-current': { stdout: 'main\n', exitCode: 0 },
      'dep deploy --branch=main': { stdout: 'Deployed\n', exitCode: 0 },
      'dep deploy --branch=feature': { stdout: 'Deployed\n', exitCode: 0 },
      // Also match commands with zx prefix
      'set -euo pipefail;git branch --show-current': { stdout: 'main\n', exitCode: 0 },
      'set -euo pipefail;dep deploy --branch=main': { stdout: 'Deployed\n', exitCode: 0 },
      'set -euo pipefail;dep deploy --branch=feature': { stdout: 'Deployed\n', exitCode: 0 },
    })
  })

  after(() => {
    $.spawn = originalSpawn
  })

  test('deploys current branch by default', async () => {
    await within(async () => {
      const result = await deploy()
      assert.equal(result.branch, 'main')
      assert.equal(result.success, true)
    })
  })

  test('deploys specified branch', async () => {
    await within(async () => {
      const result = await deploy('feature')
      assert.equal(result.branch, 'feature')
      assert.equal(result.success, true)
    })
  })
})
```

## Future: Built-in Mocking Support

The zx team is working on built-in mocking support using the store recorder and internal bus. This will provide a more robust way to mock commands in the future. For now, the approaches described above work well for testing zx scripts.

## See Also

- [Configuration](./configuration.md) - Learn about `$.spawn` and other configuration options
- [Process Promise](./process-promise.md) - Understand ProcessPromise API
- [Process Output](./process-output.md) - Understand ProcessOutput API

