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
import {parse} from 'path'

const hasBash = parse($.shell).name == 'bash'

// This one is supposed to be universal across all platforms.
{
  let foo = await $`echo foo`
  assert(foo.stdout === 'foo\n')
}

if (hasBash) {
  let hello = await $`echo Error >&2; echo Hello`
  let len = parseInt(await $`echo ${hello} | wc -c`)
  assert(len === 6)
}

if (hasBash) {
  process.env.FOO = 'foo'
  let foo = await $`echo $FOO`
  assert(foo.stdout === 'foo\n')
}

if (hasBash) {
  let greeting = `"quota'" & pwd`
  let {stdout} = await $`echo ${greeting}`
  assert(stdout === greeting + '\n')
}

if (hasBash) {
  let foo = 'hi; ls'
  let len = parseInt(await $`echo ${foo} | wc -l`)
  assert(len === 1)
}

if (hasBash) {
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  assert((await $`echo ${bar}`).stdout.trim() === bar)
}

if (hasBash) {
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
}

if (hasBash) {
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  assert(p.exitCode === 1)
}

if (hasBash) {
  process.env.FOO = 'hi; exit 1'
  await $`echo $FOO`
}

console.log(chalk.green('🍺 Success!'))
