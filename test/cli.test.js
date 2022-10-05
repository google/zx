// Copyright 2022 Google LLC
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

import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

const test = suite('cli')

$.verbose = false

// Helps detect unresolved ProcessPromise.
let promiseResolved = false
process.on('exit', () => {
  if (!promiseResolved) {
    console.error('Error: ProcessPromise never resolved.')
    process.exitCode = 1
  }
})

test('promise resolved', async () => {
  await $`echo`
  promiseResolved = true
})

test('prints version', async () => {
  assert.match((await $`node build/cli.js -v`).toString(), /\d+.\d+.\d+/)
})

test('prints help', async () => {
  let p = $`node build/cli.js -h`
  p.stdin.end()
  let help = await p
  assert.match(help.stdout, 'zx')
})

test('zx prints usage', async () => {
  let p = $`node build/cli.js`
  p.stdin.end()
  let out = await p
  assert.match(out.stdout, 'A tool for writing better scripts')
})

test('starts repl with --repl', async () => {
  let p = $`node build/cli.js --repl`
  p.stdin.write('await $`echo f"o"o`\n')
  p.stdin.write('"b"+"ar"\n')
  p.stdin.end()
  let out = await p
  assert.match(out.stdout, 'foo')
  assert.match(out.stdout, 'bar')
})

test('starts repl with verbosity off', async () => {
  let p = $`node build/cli.js --repl`
  p.stdin.write('"verbose" + " is " + $.verbose\n')
  p.stdin.end()
  let out = await p
  assert.match(out.stdout, 'verbose is false')
})

test('supports `--experimental` flag', async () => {
  let out = await $`echo 'echo("test")' | node build/cli.js --experimental`
  assert.match(out.stdout, 'test')
})

test('supports `--quiet` flag', async () => {
  let p = await $`node build/cli.js test/fixtures/markdown.md`
  assert.ok(!p.stderr.includes('ignore'), 'ignore was printed')
  assert.ok(p.stderr.includes('hello'), 'no hello')
  assert.ok(p.stdout.includes('world'), 'no world')
})

test('supports `--shell` flag ', async () => {
  let shell = $.shell
  let p =
    await $`node build/cli.js --shell=${shell} <<< '$\`echo \${$.shell}\`'`
  assert.ok(p.stderr.includes(shell))
})

test('supports `--prefix` flag ', async () => {
  let prefix = 'set -e;'
  let p =
    await $`node build/cli.js --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
  assert.ok(p.stderr.includes(prefix))
})

test('scripts from https', async () => {
  $`cat ${path.resolve('test/fixtures/echo.http')} | nc -l 8080`
  let out = await $`node build/cli.js http://127.0.0.1:8080/echo.mjs`
  assert.match(out.stderr, 'test')
})

test('scripts from https not ok', async () => {
  $`echo $'HTTP/1.1 500\n\n' | nc -l 8081`
  let out = await $`node build/cli.js http://127.0.0.1:8081`.nothrow()
  assert.match(out.stderr, "Error: Can't get")
})

test('scripts with no extension', async () => {
  await $`node build/cli.js test/fixtures/no-extension`
  assert.ok(
    /Test file to verify no-extension didn't overwrite similarly name .mjs file./.test(
      (await fs.readFile('test/fixtures/no-extension.mjs')).toString()
    )
  )
})

test('require() is working from stdin', async () => {
  let out =
    await $`node build/cli.js <<< 'console.log(require("./package.json").name)'`
  assert.match(out.stdout, 'zx')
})

test('require() is working in ESM', async () => {
  await $`node build/cli.js test/fixtures/require.mjs`
})

test('__filename & __dirname are defined', async () => {
  await $`node build/cli.js test/fixtures/filename-dirname.mjs`
})

test('markdown scripts are working', async () => {
  await $`node build/cli.js docs/markdown.md`
})

test('exceptions are caught', async () => {
  let out1 = await $`node build/cli.js <<<${'await $`wtf`'}`.nothrow()
  assert.match(out1.stderr, 'Error:')
  let out2 = await $`node build/cli.js <<<'throw 42'`.nothrow()
  assert.match(out2.stderr, '42')
})

test('eval works', async () => {
  assert.is((await $`node build/cli.js --eval 'echo(42)'`).stdout, '42\n')
  assert.is((await $`node build/cli.js -e='echo(69)'`).stdout, '69\n')
})

test('eval works with stdin', async () => {
  let p = $`(printf foo; sleep 0.1; printf bar) | node build/cli.js --eval 'echo(await stdin())'`
  assert.is((await p).stdout, 'foobar\n')
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

test('argv works with zx and node', async () => {
  assert.is(
    (await $`node build/cli.js test/fixtures/argv.mjs foo`).toString(),
    `global {"_":["foo"]}\nimported {"_":["foo"]}\n`
  )
  assert.is(
    (await $`node test/fixtures/argv.mjs bar`).toString(),
    `global {"_":["bar"]}\nimported {"_":["bar"]}\n`
  )
  assert.is(
    (await $`node build/cli.js --eval 'console.log(argv._)' baz`).toString(),
    `[ 'baz' ]\n`
  )
})

test('exit code can be set', async () => {
  let p = await $`node build/cli.js test/fixtures/exit-code.mjs`.nothrow()
  assert.is(p.exitCode, 42)
})

test.run()
