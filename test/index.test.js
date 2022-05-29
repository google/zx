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

import test from 'ava'
import { inspect } from 'node:util'
import chalk from 'chalk'
import { Writable } from 'node:stream'
import { Socket } from 'node:net'
import '../build/globals.js'
import { ProcessPromise } from '../build/index.js'

$.verbose = false

test('only stdout is used during command substitution', async (t) => {
  let hello = await $`echo Error >&2; echo Hello`
  let len = +(await $`echo ${hello} | wc -c`)
  t.is(len, 6)
})

test('env vars works', async (t) => {
  process.env.ZX_TEST_FOO = 'foo'
  let foo = await $`echo $ZX_TEST_FOO`
  t.is(foo.stdout, 'foo\n')
})

test('env vars is safe to pass', async (t) => {
  process.env.ZX_TEST_BAR = 'hi; exit 1'
  await $`echo $ZX_TEST_BAR`
  t.pass()
})

test('arguments are quoted', async (t) => {
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  t.is((await $`echo ${bar}`).stdout.trim(), bar)
})

test('undefined and empty string correctly quoted', async (t) => {
  t.verbose = true
  t.is((await $`echo -n ${undefined}`).toString(), 'undefined')
  t.is((await $`echo -n ${''}`).toString(), '')
})

test('can create a dir with a space in the name', async (t) => {
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
  t.pass()
})

test('pipefail is on', async (t) => {
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  t.not(p.exitCode, 0)
})

test('toString() is called on arguments', async (t) => {
  let foo = 0
  let p = await $`echo ${foo}`
  t.is(p.stdout, '0\n')
})

test('can use array as an argument', async (t) => {
  let args = ['-n', 'foo']
  t.is((await $`echo ${args}`).toString(), 'foo')
})

test.serial('quiet mode is working', async (t) => {
  let stdout = ''
  let log = console.log
  console.log = (...args) => {
    stdout += args.join(' ')
  }
  await quiet($`echo 'test'`)
  console.log = log
  t.is(stdout, '')
})

test('pipes are working', async (t) => {
  let { stdout } = await $`echo "hello"`
    .pipe($`awk '{print $1" world"}'`)
    .pipe($`tr '[a-z]' '[A-Z]'`)
  t.is(stdout, 'HELLO WORLD\n')

  try {
    await $`echo foo`.pipe(fs.createWriteStream('/tmp/output.txt'))
    t.is((await fs.readFile('/tmp/output.txt')).toString(), 'foo\n')

    let r = $`cat`
    fs.createReadStream('/tmp/output.txt').pipe(r.stdin)
    t.is((await r).stdout, 'foo\n')
  } finally {
    await fs.rm('/tmp/output.txt')
  }
})

test('question', async (t) => {
  let p = question('foo or bar? ', { choices: ['foo', 'bar'] })

  setImmediate(() => {
    process.stdin.emit('data', 'fo')
    process.stdin.emit('data', '\t')
    process.stdin.emit('data', '\n')
  })

  t.is(await p, 'foo')
})

test('ProcessPromise', async (t) => {
  let contents = ''
  let stream = new Writable({
    write: function (chunk, encoding, next) {
      contents += chunk.toString()
      next()
    },
  })
  let p = $`echo 'test'`.pipe(stream)
  await p
  t.true(p._piped)
  t.is(contents, 'test\n')
  t.true(p.stderr instanceof Socket)

  let err
  try {
    $`echo 'test'`.pipe('str')
  } catch (p) {
    err = p
  }
  t.is(err.message, 'The pipe() method does not take strings. Forgot $?')
})

test('ProcessPromise: inherits native Promise', async (t) => {
  const p1 = $`echo 1`
  const p2 = p1.then((v) => v)
  const p3 = p2.then((v) => v)
  const p4 = p3.catch((v) => v)
  const p5 = p1.finally((v) => v)

  t.true(p1 instanceof Promise)
  t.true(p1 instanceof ProcessPromise)
  t.true(p2 instanceof ProcessPromise)
  t.true(p3 instanceof ProcessPromise)
  t.true(p4 instanceof ProcessPromise)
  t.true(p5 instanceof ProcessPromise)
  t.true(p1 !== p2)
  t.true(p2 !== p3)
  t.true(p3 !== p4)
  t.true(p5 !== p1)
})

test('ProcessOutput thrown as error', async (t) => {
  let err
  try {
    await $`wtf`
  } catch (p) {
    err = p
  }
  t.true(err.exitCode > 0)
  t.true(err.stderr.includes('/bin/bash: wtf: command not found\n'))
  t.true(err[inspect.custom]().includes('Command not found'))
})

test('pipe() throws if already resolved', async (t) => {
  let out,
    p = $`echo "Hello"`
  await p
  try {
    out = await p.pipe($`less`)
  } catch (err) {
    t.is(
      err.message,
      `The pipe() method shouldn't be called after promise is already resolved!`
    )
  }
  if (out) {
    t.fail('Expected failure!')
  }
})

test('await $`cmd`.exitCode does not throw', async (t) => {
  t.not(await $`grep qwerty README.md`.exitCode, 0)
  t.is(await $`[[ -f README.md ]]`.exitCode, 0)
})

test('nothrow() do not throw', async (t) => {
  let { exitCode } = await nothrow($`exit 42`)
  t.is(exitCode, 42)
})

test('globby available', async (t) => {
  t.is(globby, glob)
  t.is(typeof globby, 'function')
  t.is(typeof globby.globbySync, 'function')
  t.is(typeof globby.globbyStream, 'function')
  t.is(typeof globby.generateGlobTasks, 'function')
  t.is(typeof globby.isDynamicPattern, 'function')
  t.is(typeof globby.isGitIgnored, 'function')
  t.is(typeof globby.isGitIgnoredSync, 'function')
  console.log(chalk.greenBright('globby available'))

  t.deepEqual(await globby('*.md'), ['README.md'])
})

test('fetch', async (t) => {
  t.regex(
    await fetch('https://medv.io').then((res) => res.text()),
    /Anton Medvedev/
  )
})

test('executes a script from $PATH', async (t) => {
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
  t.pass()
})

test('cd() works with relative paths', async (t) => {
  await $`node build/cli.js test/fixtures/cd-relative-paths.mjs`
  t.pass()
})

test('cd() does not affect parallel contexts', async (t) => {
  await $`node build/cli.js test/fixtures/cd-parallel-contexts.mjs`
  t.pass()
})

test('kill() method works', async (t) => {
  await $`node build/cli.js test/fixtures/kill.mjs`
  t.pass()
})

test('a signal is passed with kill() method', async (t) => {
  await $`node build/cli.js test/fixtures/kill-signal.mjs`
  t.pass()
})

test('YAML works', async (t) => {
  t.deepEqual(YAML.parse(YAML.stringify({ foo: 'bar' })), { foo: 'bar' })
})

test('which available', async (t) => {
  t.is(which.sync('npm'), await which('npm'))
})
