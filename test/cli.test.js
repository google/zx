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

import { assert, testFactory } from './test-utils.js'

const test = testFactory('cli', import.meta)

test('supports `-v` flag / prints version', async () => {
  let v = (await $`node build/cli.js -v`).toString().trim()
  assert.equal(v, require('../package.json').version)
})

test('prints help', async () => {
  let help
  try {
    await $`node build/cli.js`
  } catch (err) {
    help = err.toString().trim()
  }
  assert(help.includes('print current zx version'))
})

test('supports `--experimental` flag', async () => {
  await $`echo 'echo("test")' | node build/cli.js --experimental`
})

test('supports `--quiet` flag / Quiet mode is working', async () => {
  let p = await $`node build/cli.js --quiet docs/markdown.md`
  assert(!p.stdout.includes('whoami'))
})

test('supports `--shell` flag ', async () => {
  let shell = $.shell
  let p = await $`node build/cli.js --shell=${shell} <<< '$\`echo \${$.shell}\`'`
  assert(p.stdout.includes(shell))
})

test('supports `--prefix` flag ', async () => {
  let prefix = 'set -e;'
  let p = await $`node build/cli.js --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
  assert(p.stdout.includes(prefix))
})

test('scripts from https', async () => {
  let script = path.resolve('test/fixtures/echo.http')
  let server = quiet($`while true; do cat ${script} | nc -l 8080; done`)
  let p = await quiet($`node build/cli.js http://127.0.0.1:8080/echo.mjs`)

  assert(p.stdout.includes('test'))
  server.kill()

  let err
  try {
    await quiet($`node build/cli.js http://127.0.0.1:8081/echo.mjs`)
  } catch (e) {
    err = e
  }
  assert(err.stderr.includes('ECONNREFUSED'))
})

test('scripts with no extension', async () => {
  await $`node build/cli.js test/fixtures/no-extension`
  assert.match(
    (await fs.readFile('test/fixtures/no-extension.mjs')).toString(),
    /Test file to verify no-extension didn't overwrite similarly name .mjs file./
  )
})

test('The require() is working from stdin', async () => {
  await $`node build/cli.js <<< 'require("./package.json").name'`
})

test('Markdown scripts are working', async () => {
  await $`node build/cli.js docs/markdown.md`
})
