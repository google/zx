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

import {inspect} from 'util'
import chalk from 'chalk'
import {Writable} from 'stream'
import {Socket} from 'net'

import {assert, test as t} from './test-utils.mjs'

const test = t.bind(null, 'index')

if (test('Only stdout is used during command substitution')) {
  let hello = await $`echo Error >&2; echo Hello`
  let len = +(await $`echo ${hello} | wc -c`)
  assert(len === 6)
}

if (test('Env vars works')) {
  process.env.FOO = 'foo'
  let foo = await $`echo $FOO`
  assert(foo.stdout === 'foo\n')
}

if (test('Env vars is safe to pass')) {
  process.env.FOO = 'hi; exit 1'
  await $`echo $FOO`
}

if (test('Arguments are quoted')) {
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  assert((await $`echo ${bar}`).stdout.trim() === bar)
}

if (test('Undefined and empty string correctly quoted')) {
  $`echo ${undefined}`
  $`echo ${''}`
}

if (test('Can create a dir with a space in the name')) {
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
}

if (test('Pipefail is on')) {
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  assert(p.exitCode !== 0)
}

if (test('The __filename & __dirname are defined')) {
  console.log(__filename, __dirname)
}

if (test('The toString() is called on arguments')) {
  let foo = 0
  let p = await $`echo ${foo}`
  assert(p.stdout === '0\n')
}

if (test('Can use array as an argument')) {
  try {
    let files = ['./zx.mjs', './test/index.test.mjs']
    await $`tar czf archive ${files}`
  } finally {
    await $`rm archive`
  }
}

if (test('Quiet mode is working')) {
  let stdout = ''
  let log = console.log
  console.log = (...args) => {stdout += args.join(' ')}
  await quiet($`echo 'test'`)
  console.log = log
  assert(!stdout.includes('echo'))
}

if (test('Pipes are working')) {
  let {stdout} = await $`echo "hello"`
    .pipe($`awk '{print $1" world"}'`)
    .pipe($`tr '[a-z]' '[A-Z]'`)
  assert(stdout === 'HELLO WORLD\n')

  try {
    await $`echo foo`
      .pipe(fs.createWriteStream('/tmp/output.txt'))
    assert((await fs.readFile('/tmp/output.txt')).toString() === 'foo\n')

    let r = $`cat`
    fs.createReadStream('/tmp/output.txt')
      .pipe(r.stdin)
    assert((await r).stdout === 'foo\n')
  } finally {
    await fs.rm('/tmp/output.txt')
  }
}

// Works on macOS but fails oon ubuntu...
// if (test('question')) {
//   let p = question('foo or bar? ', {choices: ['foo', 'bar']})
//
//   setTimeout(() => {
//     process.stdin.emit('data', 'fo')
//     process.stdin.emit('data', '\t')
//     process.stdin.emit('data', '\t')
//     process.stdin.emit('data', '\r\n')
//   }, 100)
//
//   assert.equal((await p).toString(), 'foo')
// }

if (test('ProcessPromise')) {
  let contents = ''
  let stream = new Writable({
    write: function(chunk, encoding, next) {
      contents += chunk.toString()
      next()
    }
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
  assert.equal(err.message, 'The pipe() method does not take strings. Forgot $?')
}

if (test('ProcessOutput thrown as error')) {
  let err
  try {
    await $`wtf`
  } catch (p) {
    err = p
  }
  assert(err.exitCode > 0)
  assert(err.stderr.includes('/bin/bash: wtf: command not found\n'))
  assert(err[inspect.custom]().includes('Command not found'))
}

if (test('The pipe() throws if already resolved')) {
  let out, p = $`echo "Hello"`
  await p
  try {
    out = await p.pipe($`less`)
  } catch (err) {
    assert.equal(err.message, `The pipe() method shouldn't be called after promise is already resolved!`)
  }
  if (out) {
    assert.fail('Expected failure!')
  }
}

if (test('ProcessOutput::exitCode do not throw')) {
  assert(await $`grep qwerty README.md`.exitCode !== 0)
  assert(await $`[[ -f ${__filename} ]]`.exitCode === 0)
}

if (test('The nothrow() do not throw')) {
  let {exitCode} = await nothrow($`exit 42`)
  assert(exitCode === 42)
}

if (test('globby available')) {
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
    'test/fixtures/no-extension.mjs'
  ])
}

if (test('fetch')) {
  assert(
    await fetch('https://example.com'),
    await fetch('https://example.com', {method: 'GET'})
  )
}

if (test('Executes a script from $PATH')) {
  const isWindows = process.platform === 'win32'
  const oldPath = process.env.PATH

  const envPathSeparator = isWindows ? ';' : ':'
  process.env.PATH += envPathSeparator + path.resolve('/tmp/')

  const toPOSIXPath = (_path) =>
    _path.split(path.sep).join(path.posix.sep)

  const zxPath = path.resolve('./zx.mjs')
  const zxLocation = isWindows ? toPOSIXPath(zxPath) : zxPath
  const scriptCode = `#!/usr/bin/env ${zxLocation}\nconsole.log('The script from path runs.')`

  try {
    await $`echo ${scriptCode}`
      .pipe(fs.createWriteStream('/tmp/script-from-path', {mode: 0o744}))
    await $`script-from-path`
  } finally {
    process.env.PATH = oldPath
    fs.rmSync('/tmp/script-from-path')
  }
}

if (test('The cd() works with relative paths')) {
  let cwd = process.cwd()
  try {
    fs.mkdirpSync('/tmp/zx-cd-test/one/two')
    cd('/tmp/zx-cd-test/one/two')
    let p1 = $`pwd`
    cd('..')
    let p2 = $`pwd`
    cd('..')
    let p3 = $`pwd`

    let results = (await Promise.all([p1, p2, p3]))
      .map(p => path.basename(p.stdout.trim()))

    assert.deepEqual(results, ['two', 'one', 'zx-cd-test'])
  } finally {
    fs.rmSync('/tmp/zx-cd-test', {recursive: true})
    cd(cwd)
  }
}

if (test('The kill() method works')) {
  let p = nothrow($`sleep 9999`)
  setTimeout(() => {
    p.kill()
  }, 100)
  await p
}

if (test('The signal is passed with kill() method')) {
  let p = $`while true; do :; done`
  setTimeout(() => p.kill('SIGKILL'), 100)
  let signal
  try {
    await p
  } catch (p) {
    signal = p.signal
  }
  assert.equal(signal, 'SIGKILL')
}

if (test('YAML works')) {
  assert.deepEqual(YAML.parse(YAML.stringify({foo: 'bar'})), {foo: 'bar'})
  console.log(chalk.greenBright('YAML works'))
}

if (test('which available')) {
  assert.equal(which.sync('npm'), await which('npm'))
}

if (test('require() is working in ESM')) {
  let data = require('../package.json')
  assert.equal(data.name, 'zx')
  assert.equal(data, require('zx/package.json'))
}
