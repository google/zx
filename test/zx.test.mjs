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

import {assert, test as t} from './test-utils.mjs'

const test = t.bind(null, 'zx')

if (test('supports `-v` flag / prints version')) {
  let v = (await $`node zx.mjs -v`).toString().trim()
  assert.equal(v, require('../package.json').version)
}

if (test('prints help')) {
  let help
  try {
    await $`node zx.mjs`
  } catch (err) {
    help = err.toString().trim()
  }
  assert(help.includes('print current zx version'))
}

if (test('supports `--experimental` flag')) {
  await $`echo 'echo("test")' | node zx.mjs --experimental`
}

if (test('supports `--quiet` flag / Quiet mode is working')) {
  let p = await $`node zx.mjs --quiet docs/markdown.md`
  assert(!p.stdout.includes('whoami'))
}

if (test('Eval script from https ref')) {
  let script = path.resolve('test/fixtures/echo.http')
  let server = quiet($`while true; do cat ${script} | nc -l 8080; done`)
  let p = await quiet($`node zx.mjs http://localhost:8080/echo.mjs`)

  assert(p.stdout.includes('test'))
  server.kill()
}

if (test('Scripts with no extension')) {
  await $`node zx.mjs test/fixtures/no-extension`
  assert.match((await fs.readFile('test/fixtures/no-extension.mjs')).toString(), /Test file to verify no-extension didn't overwrite similarly name .mjs file./)
}

if (test('The require() is working from stdin')) {
  await $`node zx.mjs <<< 'require("./package.json").name'`
}

if (test('Markdown scripts are working')) {
  await $`node zx.mjs docs/markdown.md`
}
