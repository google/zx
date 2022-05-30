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

import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { inspect } from 'node:util'
import chalk from 'chalk'
import { Writable } from 'node:stream'
import { Socket } from 'node:net'
import '../build/globals.js'
import { ProcessPromise } from '../build/index.js'

test('only stdout is used during command substitution', async () => {
  let hello = await $`echo Error >&2; echo Hello`
  let len = +(await $`echo ${hello} | wc -c`)
  assert.is(len, 6)
})

test('env vars works', async () => {
  process.env.ZX_TEST_FOO = 'foo'
  let foo = await $`echo $ZX_TEST_FOO`
  assert.is(foo.stdout, 'foo\n')
})

test('env vars is safe to pass', async () => {
  process.env.ZX_TEST_BAR = 'hi; exit 1'
  await $`echo $ZX_TEST_BAR`
})

test('arguments are quoted', async () => {
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  assert.is((await $`echo ${bar}`).stdout.trim(), bar)
})

test('undefined and empty string correctly quoted', async () => {
  $.verbose = true
  assert.is((await $`echo -n ${undefined}`).toString(), 'undefined')
  assert.is((await $`echo -n ${''}`).toString(), '')
})

test('can create a dir with a space in the name', async () => {
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } catch {
    assert.unreachable()
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
})

test('pipefail is on', async () => {
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  assert.is.not(p.exitCode, 0)
})

test('toString() is called on arguments', async () => {
  let foo = 0
  let p = await $`echo ${foo}`
  assert.is(p.stdout, '0\n')
})

test('can use array as an argument', async () => {
  let args = ['-n', 'foo']
  assert.is((await $`echo ${args}`).toString(), 'foo')
})

test('quiet mode is working', async () => {
  let stdout = ''
  let log = console.log
  console.log = (...args) => {
    stdout += args.join(' ')
  }
  await quiet($`echo 'test'`)
  console.log = log
  assert.is(stdout, '')
})

test('pipes are working', async () => {
  let { stdout } = await $`echo "hello"`
    .pipe($`awk '{print $1" world"}'`)
    .pipe($`tr '[a-z]' '[A-Z]'`)
  assert.is(stdout, 'HELLO WORLD\n')

  try {
    await $`echo foo`.pipe(fs.createWriteStream('/tmp/output.txt'))
    assert.is((await fs.readFile('/tmp/output.txt')).toString(), 'foo\n')

    let r = $`cat`
    fs.createReadStream('/tmp/output.txt').pipe(r.stdin)
    assert.is((await r).stdout, 'foo\n')
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

  assert.is(await p, 'foo')
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
  assert.ok(p._piped)
  assert.is(contents, 'test\n')
  assert.ok(p.stderr instanceof Socket)

  let err
  try {
    $`echo 'test'`.pipe('str')
  } catch (p) {
    err = p
  }
  assert.is(err.message, 'The pipe() method does not take strings. Forgot $?')
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
  assert.ok(err.exitCode > 0)
  assert.ok(err.stderr.includes('/bin/bash: wtf: command not found\n'))
  assert.ok(err[inspect.custom]().includes('Command not found'))
})

test('pipe() throws if already resolved', async (t) => {
  let out,
    p = $`echo "Hello"`
  await p
  try {
    out = await p.pipe($`less`)
  } catch (err) {
    assert.is(
      err.message,
      `The pipe() method shouldn't be called after promise is already resolved!`
    )
  }
  if (out) {
    t.fail('Expected failure!')
  }
})

test('await $`cmd`.exitCode does not throw', async () => {
  assert.is.not(await $`grep qwerty README.md`.exitCode, 0)
  assert.is(await $`[[ -f README.md ]]`.exitCode, 0)
})

test('nothrow() do not throw', async () => {
  let { exitCode } = await nothrow($`exit 42`)
  assert.is(exitCode, 42)
})

test('globby available', async () => {
  assert.is(globby, glob)
  assert.is(typeof globby, 'function')
  assert.is(typeof globby.globbySync, 'function')
  assert.is(typeof globby.globbyStream, 'function')
  assert.is(typeof globby.generateGlobTasks, 'function')
  assert.is(typeof globby.isDynamicPattern, 'function')
  assert.is(typeof globby.isGitIgnored, 'function')
  assert.is(typeof globby.isGitIgnoredSync, 'function')
  console.log(chalk.greenBright('globby available'))

  assert.equal(await globby('*.md'), ['README.md'])
})

test('fetch', async () => {
  assert.match(
    await fetch('https://medv.io').then((res) => res.text()),
    /Anton Medvedev/
  )
})

test('executes a script from $PATH', async () => {
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

test('cd() works with relative paths', async () => {
  await $`node build/cli.js test/fixtures/cd-relative-paths.mjs`
})

test('cd() does not affect parallel contexts', async () => {
  await $`node build/cli.js test/fixtures/cd-parallel-contexts.mjs`
})

test('kill() method works', async () => {
  await $`node build/cli.js test/fixtures/kill.mjs`
})

test('a signal is passed with kill() method', async () => {
  await $`node build/cli.js test/fixtures/kill-signal.mjs`
})

test('YAML works', async () => {
  assert.equal(YAML.parse(YAML.stringify({ foo: 'bar' })), { foo: 'bar' })
})

test('which available', async () => {
  assert.is(which.sync('npm'), await which('npm'))
})

test.run()
