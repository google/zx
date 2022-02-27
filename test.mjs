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

import {strict as assert} from 'assert'
import {retry} from './experimental.mjs'

let всегоТестов = 0

function test(name) {
  let фильтр = process.argv[3] || '.'
  if (RegExp(фильтр).test(name)) {
    console.log('\n' + chalk.bgGreenBright.black(` ${name} `))
    всегоТестов++
    return true
  }
  return false
}

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
    let files = ['./index.mjs', './zx.mjs', './package.json']
    await $`tar czf archive ${files}`
  } finally {
    await $`rm archive`
  }
}

if (test('Scripts with no extension')) {
  await $`node zx.mjs tests/no-extension`
  assert.match((await fs.readFile('tests/no-extension.mjs')).toString(), /Test file to verify no-extension didn't overwrite similarly name .mjs file./)
}

if (test('The require() is working from stdin')) {
  await $`node zx.mjs <<< 'require("./package.json").name'`
}

if (test('Markdown scripts are working')) {
  await $`node zx.mjs docs/markdown.md`
}

if (test('Quiet mode is working')) {
  let {stdout} = await $`node zx.mjs --quiet docs/markdown.md`
  assert(!stdout.includes('whoami'))
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

if (test('ProcessOutput thrown as error')) {
  let err
  try {
    await $`wtf`
  } catch (p) {
    err = p
  }
  assert(err.exitCode > 0)
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
  try {
    fs.mkdirpSync('/tmp/zx-cd-test/one/two')
    cd('/tmp/zx-cd-test/one/two')
    cd('..')
    cd('..')
    let pwd = (await $`pwd`).stdout.trim()
    assert.equal(path.basename(pwd), 'zx-cd-test')
  } finally {
    fs.rmSync('/tmp/zx-cd-test', {recursive: true})
    cd(__dirname)
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

if (test('Retry works')) {
  let exitCode = 0
  try {
    await retry(5)`exit 123`
  } catch (p) {
    exitCode = p.exitCode
  }
  assert.equal(exitCode, 123)
}

let version
if (test('require() is working in ESM')) {
  let data = require('./package.json')
  version = data.version
  assert.equal(data.name, 'zx')
}

console.log('\n' +
  chalk.black.bgYellowBright(` zx version is ${version} `) + '\n' +
  chalk.greenBright(` 🍺 ${всегоТестов} tests passed `)
)
