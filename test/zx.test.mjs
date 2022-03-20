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

import {assert, testFactory} from './test-utils.mjs'

const test = testFactory('zx', import.meta)

test('supports `-v` flag / prints version', async () => {
  let v = (await $`node zx.mjs -v`).toString().trim()
  assert.equal(v, require('../package.json').version)
})

test('prints help', async () => {
  let help
  try {
    await $`node zx.mjs`
  } catch (err) {
    help = err.toString().trim()
  }
  assert(help.includes('print current zx version'))
})

test('supports `--experimental` flag', async () => {
  await $`echo 'echo("test")' | node zx.mjs --experimental`
})

test('supports `--quiet` flag / Quiet mode is working', async () => {
  let p = await $`node zx.mjs --quiet docs/markdown.md`
  assert(!p.stdout.includes('whoami'))
})

test('supports `--shell` flag ', async () => {
  let shell = $.shell
  let p = await $`node zx.mjs --shell=${shell} <<< '$\`echo \${$.shell}\`'`
  assert(p.stdout.includes(shell))
})

test('supports `--prefix` flag ', async () => {
  let prefix = 'set -e;'
  let p = await $`node zx.mjs --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
  assert(p.stdout.includes(prefix))
})

test('Eval script from https ref', async () => {
  let script = path.resolve('test/fixtures/echo.http')
  let server = quiet($`while true; do cat ${script} | nc -l 8080; done`)
  let p = await quiet($`node zx.mjs http://127.0.0.1:8080/echo.mjs`)

  assert(p.stdout.includes('test'))
  server.kill()

  let err
  try {
    await quiet($`node zx.mjs http://127.0.0.1:8081/echo.mjs`)
  } catch (e) {
    err = e
  }
  assert(err.stderr.includes('ECONNREFUSED'))
})

test('Scripts with no extension', async () => {
  await $`node zx.mjs test/fixtures/no-extension`
  assert.match((await fs.readFile('test/fixtures/no-extension.mjs')).toString(), /Test file to verify no-extension didn't overwrite similarly name .mjs file./)
})

test('The require() is working from stdin', async () => {
  await $`node zx.mjs <<< 'require("./package.json").name'`
})

test('Markdown scripts are working', async () => {
  await $`node zx.mjs docs/markdown.md`
})
