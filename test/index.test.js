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

import { inspect } from 'node:util'
import chalk from 'chalk'
import { Writable } from 'node:stream'
import { Socket } from 'node:net'

import { assert, testFactory } from './test-utils.js'
import { ProcessPromise } from '../build/index.js'
import { getCtx, runInCtx } from '../build/context.js'

const test = testFactory('index', import.meta)

test('Only stdout is used during command substitution', async () => {
  let hello = await $`echo Error >&2; echo Hello`
  let len = +(await $`echo ${hello} | wc -c`)
  assert(len === 6)
})

test('Env vars works', async () => {
  process.env.FOO = 'foo'
  let foo = await $`echo $FOO`
  assert(foo.stdout === 'foo\n')
})

test('Env vars is safe to pass', async () => {
  process.env.FOO = 'hi; exit 1'
  await $`echo $FOO`
})

test('Arguments are quoted', async () => {
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  assert((await $`echo ${bar}`).stdout.trim() === bar)
})

test('Undefined and empty string correctly quoted', async () => {
  $`echo ${undefined}`
  $`echo ${''}`
})

test('Can create a dir with a space in the name', async () => {
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
})

test('Pipefail is on', async () => {
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  assert(p.exitCode !== 0)
})

test('The __filename & __dirname are defined', async () => {
  console.log(__filename, __dirname)
})

test('The toString() is called on arguments', async () => {
  let foo = 0
  let p = await $`echo ${foo}`
  assert(p.stdout === '0\n')
})

test('Can use array as an argument', async () => {
  try {
    let files = ['./cli.ts', './test/index.test.js']
    await $`tar czf archive ${files}`
  } finally {
    await $`rm archive`
  }
})

test('Quiet mode is working', async () => {
  let stdout = ''
  let log = console.log
  console.log = (...args) => {
    stdout += args.join(' ')
  }
  await quiet($`echo 'test'`)
  console.log = log
  assert(!stdout.includes('echo'))
})

test('Pipes are working', async () => {
  let { stdout } = await $`echo "hello"`
    .pipe($`awk '{print $1" world"}'`)
    .pipe($`tr '[a-z]' '[A-Z]'`)
  assert(stdout === 'HELLO WORLD\n')

  try {
    await $`echo foo`.pipe(fs.createWriteStream('/tmp/output.txt'))
    assert((await fs.readFile('/tmp/output.txt')).toString() === 'foo\n')

    let r = $`cat`
    fs.createReadStream('/tmp/output.txt').pipe(r.stdin)
    assert((await r).stdout === 'foo\n')
  } finally {
    await fs.rm('/tmp/output.txt')
  }
})

test('question', async () => {
  let p = question('foo or bar? ', { choices: ['foo', 'bar'] })

  setImmediate(() => {
    process.stdin.emit('data', 'fo')
    process.stdin.emit('data', '\t')
    process.stdin.emit('data', '\n')
  })

  assert.equal(await p, 'foo')
})

test('ProcessPromise', async () => {
  let contents = ''
  let stream = new Writable({
    write: function (chunk, encoding, next) {
      contents += chunk.toString()
      next()
    },
  })
  let p = $`echo 'test'`.pipe(stream)
  await p
  assert(p._piped)
  assert.equal(contents, 'test\n')
  assert(p.stderr instanceof Socket)

  let err
  try {
    $`echo 'test'`.pipe('str')
  } catch (p) {
    err = p
  }
  assert.equal(
    err.message,
    'The pipe() method does not take strings. Forgot $?'
  )
})

test('ProcessPromise: inherits native Promise', async () => {
  const p1 = $`echo 1`
  const p2 = p1.then((v) => v)
  const p3 = p2.then((v) => v)
  const p4 = p3.catch((v) => v)
  const p5 = p1.finally((v) => v)

  assert.ok(p1 instanceof Promise)
  assert.ok(p1 instanceof ProcessPromise)
  assert.ok(p2 instanceof ProcessPromise)
  assert.ok(p3 instanceof ProcessPromise)
  assert.ok(p4 instanceof ProcessPromise)
  assert.ok(p5 instanceof ProcessPromise)
  assert.ok(p1 !== p2)
  assert.ok(p2 !== p3)
  assert.ok(p3 !== p4)
  assert.ok(p5 !== p1)
})

test('ProcessOutput thrown as error', async () => {
  let err
  try {
    await $`wtf`
  } catch (p) {
    err = p
  }
  assert(err.exitCode > 0)
  assert(err.stderr.includes('/bin/bash: wtf: command not found\n'))
  assert(err[inspect.custom]().includes('Command not found'))
})

test('The pipe() throws if already resolved', async () => {
  let out,
    p = $`echo "Hello"`
  await p
  try {
    out = await p.pipe($`less`)
  } catch (err) {
    assert.equal(
      err.message,
      `The pipe() method shouldn't be called after promise is already resolved!`
    )
  }
  if (out) {
    assert.fail('Expected failure!')
  }
})

test('ProcessOutput::exitCode do not throw', async () => {
  assert((await $`grep qwerty README.md`.exitCode) !== 0)
  assert((await $`[[ -f ${__filename} ]]`.exitCode) === 0)
})

test('The nothrow() do not throw', async () => {
  let { exitCode } = await nothrow($`exit 42`)
  assert(exitCode === 42)
})

test('globby available', async () => {
  assert(globby === glob)
  assert(typeof globby === 'function')
  assert(typeof globby.globbySync === 'function')
  assert(typeof globby.globbyStream === 'function')
  assert(typeof globby.generateGlobTasks === 'function')
  assert(typeof globby.isDynamicPattern === 'function')
  assert(typeof globby.isGitIgnored === 'function')
  assert(typeof globby.isGitIgnoredSync === 'function')
  console.log(chalk.greenBright('globby available'))

  assert(await globby('test/fixtures/*'), [
    'test/fixtures/interactive.mjs',
    'test/fixtures/no-extension',
    'test/fixtures/no-extension.mjs',
  ])
})

test('fetch', async () => {
  assert(
    await fetch('https://example.com'),
    await fetch('https://example.com', { method: 'GET' })
  )
})

test('Executes a script from $PATH', async () => {
  const isWindows = process.platform === 'win32'
  const oldPath = process.env.PATH

  const envPathSeparator = isWindows ? ';' : ':'
  process.env.PATH += envPathSeparator + path.resolve('/tmp/')

  const toPOSIXPath = (_path) => _path.split(path.sep).join(path.posix.sep)

  const zxPath = path.resolve('./build/cli.js')
  const zxLocation = isWindows ? toPOSIXPath(zxPath) : zxPath
  const scriptCode = `#!/usr/bin/env ${zxLocation}\nconsole.log('The script from path runs.')`

  try {
    await $`chmod +x ${zxLocation}`
    await $`echo ${scriptCode}`.pipe(
      fs.createWriteStream('/tmp/script-from-path', { mode: 0o744 })
    )
    await $`script-from-path`
  } finally {
    process.env.PATH = oldPath
    fs.rmSync('/tmp/script-from-path')
  }
})

test('The cd() works with relative paths', async () => {
  let cwd = process.cwd()
  assert.equal($.cwd, cwd)
  try {
    fs.mkdirpSync('/tmp/zx-cd-test/one/two')
    cd('/tmp/zx-cd-test/one/two')
    let p1 = $`pwd`
    assert.ok($.cwd.endsWith('/two'))
    assert.ok(process.cwd().endsWith('/two'))

    cd('..')
    let p2 = $`pwd`
    assert.ok($.cwd.endsWith('/one'))
    assert.ok(process.cwd().endsWith('/one'))

    cd('..')
    let p3 = $`pwd`
    assert.ok(process.cwd().endsWith('/zx-cd-test'))
    assert.ok($.cwd.endsWith('/tmp/zx-cd-test'))

    let results = (await Promise.all([p1, p2, p3])).map((p) =>
      path.basename(p.stdout.trim())
    )

    assert.deepEqual(results, ['two', 'one', 'zx-cd-test'])
  } catch (e) {
    assert(!e, e)
  } finally {
    fs.rmSync('/tmp/zx-cd-test', { recursive: true })
    cd(cwd)
    assert.equal($.cwd, cwd)
  }
})

test('cd() does not affect parallel contexts', async () => {
  let cwd = process.cwd()
  let resolve, reject
  let promise = new ProcessPromise((...args) => ([resolve, reject] = args))

  try {
    fs.mkdirpSync('/tmp/zx-cd-parallel')
    runInCtx({ ...getCtx() }, async () => {
      assert.equal($.cwd, cwd)
      await sleep(10)
      cd('/tmp/zx-cd-parallel')
      assert.ok(getCtx().cwd.endsWith('/zx-cd-parallel'))
      assert.ok($.cwd.endsWith('/zx-cd-parallel'))
    })

    runInCtx({ ...getCtx() }, async () => {
      assert.equal($.cwd, cwd)
      assert.equal(getCtx().cwd, cwd)
      await sleep(20)
      assert.equal(getCtx().cwd, cwd)
      assert.ok($.cwd.endsWith('/zx-cd-parallel'))
      resolve()
    })

    await promise
  } catch (e) {
    assert(!e, e)
  } finally {
    fs.rmSync('/tmp/zx-cd-parallel', { recursive: true })
    cd(cwd)
  }
})

test('The kill() method works', async () => {
  let p = nothrow($`sleep 9999`)
  setTimeout(() => {
    p.kill()
  }, 100)
  await p
})

test('The signal is passed with kill() method', async () => {
  let p = $`while true; do :; done`
  setTimeout(() => p.kill('SIGKILL'), 100)
  let signal
  try {
    await p
  } catch (p) {
    signal = p.signal
  }
  assert.equal(signal, 'SIGKILL')
})

test('YAML works', async () => {
  assert.deepEqual(YAML.parse(YAML.stringify({ foo: 'bar' })), { foo: 'bar' })
  console.log(chalk.greenBright('YAML works'))
})

test('which available', async () => {
  assert.equal(which.sync('npm'), await which('npm'))
})

test('require() is working in ESM', async () => {
  let data = require('../package.json')
  assert.equal(data.name, 'zx')
  assert.equal(data, require('zx/package.json'))
})
