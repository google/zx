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

import test from 'ava'
import '../build/globals.js'

$.verbose = false

test('supports `-v` flag / prints version', async (t) => {
  t.regex((await $`node build/cli.js -v`).toString(), /\d+.\d+.\d+/)
})

test('prints help', async (t) => {
  let help
  try {
    await $`node build/cli.js`
  } catch (err) {
    help = err.toString().trim()
  }
  t.true(help.includes('print current zx version'))
})

test('supports `--experimental` flag', async (t) => {
  await $`echo 'echo("test")' | node build/cli.js --experimental`
  t.pass()
})

test('supports `--quiet` flag / Quiet mode is working', async (t) => {
  let p = await $`node build/cli.js --quiet docs/markdown.md`
  t.true(!p.stdout.includes('whoami'))
})

test('supports `--shell` flag ', async (t) => {
  let shell = $.shell
  let p =
    await $`node build/cli.js --shell=${shell} <<< '$\`echo \${$.shell}\`'`
  t.true(p.stdout.includes(shell))
})

test('supports `--prefix` flag ', async (t) => {
  let prefix = 'set -e;'
  let p =
    await $`node build/cli.js --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
  t.true(p.stdout.includes(prefix))
})

test('scripts from https', async (t) => {
  let script = path.resolve('test/fixtures/echo.http')
  let server = quiet($`while true; do cat ${script} | nc -l 8080; done`)
  let p = await quiet($`node build/cli.js http://127.0.0.1:8080/echo.mjs`)

  t.true(p.stdout.includes('test'))
  server.kill()

  let err
  try {
    await quiet($`node build/cli.js http://127.0.0.1:8081/echo.mjs`)
  } catch (e) {
    err = e
  }
  t.true(err.stderr.includes('ECONNREFUSED'))
})

test('scripts with no extension', async (t) => {
  await $`node build/cli.js test/fixtures/no-extension`
  t.true(
    /Test file to verify no-extension didn't overwrite similarly name .mjs file./.test(
      (await fs.readFile('test/fixtures/no-extension.mjs')).toString()
    )
  )
})

test('require() is working from stdin', async (t) => {
  await $`node build/cli.js <<< 'require("./package.json").name'`
  t.pass()
})

test('require() is working in ESM', async (t) => {
  await $`node build/cli.js test/fixtures/require.mjs`
  t.pass()
})

test('__filename & __dirname are defined', async (t) => {
  await $`node build/cli.js test/fixtures/filename-dirname.mjs`
  t.pass()
})

test('markdown scripts are working', async (t) => {
  await $`node build/cli.js docs/markdown.md`
  t.pass()
})
