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

{
  let hello = await $`echo Error >&2; echo Hello`
  let len = parseInt(await $`echo ${hello} | wc -c`)
  assert(len === 6)
}

{
  process.env.FOO = 'foo'
  let foo = await $`echo $FOO`
  assert(foo.stdout === 'foo\n')
}

{
  let greeting = `"quota'" & pwd`
  let {stdout} = await $`echo ${greeting}`
  assert(stdout === greeting + '\n')
}

{
  let foo = 'hi; ls'
  let len = parseInt(await $`echo ${foo} | wc -l`)
  assert(len === 1)
}

{
  let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
  assert((await $`echo ${bar}`).stdout.trim() === bar)
}

{
  let name = 'foo bar'
  try {
    await $`mkdir /tmp/${name}`
  } finally {
    await fs.rmdir('/tmp/' + name)
  }
}

{
  let p
  try {
    p = await $`cat /dev/not_found | sort`
  } catch (e) {
    console.log('Caught an exception -> ok')
    p = e
  }
  assert(p.exitCode === 1)
}

{
  process.env.FOO = 'hi; exit 1'
  await $`echo $FOO`
}

{
  console.log(__filename, __dirname)
}

{
  let foo = 0
  let p = await $`echo ${foo}`
  assert(p.stdout === '0\n')
}

{
  try {
    let files = ['./index.mjs', './zx.mjs', './package.json']
    await $`tar czf archive ${files}`
  } finally {
    await $`rm archive`
  }
}

{
  const {name, version} = require('./package.json')
  assert(typeof name === 'string')
  console.log(chalk.black.bgYellowBright(` ${name} version is ${version} `))
}

console.log(chalk.greenBright(' 🍺 Success!'))
