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

import chalk from 'chalk'
import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

const test = suite('goods')

$.verbose = false

test('question() works', async () => {
  let p = $`node build/cli.js --eval "
  let answer = await question('foo or bar? ', { choices: ['foo', 'bar'] })
  echo('Answer is', answer)
"`
  p.stdin.write('foo\n')
  p.stdin.end()
  const out = await p
  assert.not.match(out.stdout, '*')
  assert.match(out.stdout, 'Answer is foo')
})

test('question() with muted option works', async () => {
  let p = $`node build/cli.js --eval "
  let answer = await question('how are you? ', { muted: true })
  echo(answer)
"`
  const stringToWrite = 'this is simple muted text'
  p.stdin.write(`${stringToWrite}\n`)
  p.stdin.end()
  const out = await p
  assert.not.match(out.stdout.split('\n')[0], stringToWrite)
  assert.match(out.stdout, stringToWrite)
})

test('question() with muted option and custom muted character works', async () => {
  let p = $`node build/cli.js --eval "
  let answer = await question('how are you? ', { muted: true, mutedCharacter: '*' })
  echo(answer)
"`
  const stringToWrite = 'this is simple muted text'
  p.stdin.write(`${stringToWrite}\n`)
  p.stdin.end()
  const out = await p
  assert.match(out.stdout, Array.from({ length: stringToWrite.length }).map(() => '*').join(''))
  assert.match(out.stdout, stringToWrite)
})

test('globby available', async () => {
  assert.is(globby, glob)
  assert.is(typeof globby, 'function')
  assert.is(typeof globby.globbySync, 'function')
  assert.is(typeof globby.globbyStream, 'function')
  assert.is(typeof globby.generateGlobTasks, 'function')
  assert.is(typeof globby.isDynamicPattern, 'function')
  assert.is(typeof globby.isGitIgnored, 'function')
  assert.is(typeof globby.isGitIgnoredSync, 'function')
  assert.equal(await globby('*.md'), ['README.md'])
})

test('fetch() works', async () => {
  assert.match(
    await fetch('https://medv.io').then((res) => res.text()),
    /Anton Medvedev/
  )
})

test('echo() works', async () => {
  let stdout = ''
  let log = console.log
  console.log = (...args) => {
    stdout += args.join(' ')
  }
  echo(chalk.cyan('foo'), chalk.green('bar'), chalk.bold('baz'))
  echo`${chalk.cyan('foo')} ${chalk.green('bar')} ${chalk.bold('baz')}`
  echo(
    await $`echo ${chalk.cyan('foo')}`,
    await $`echo ${chalk.green('bar')}`,
    await $`echo ${chalk.bold('baz')}`
  )
  console.log = log
  assert.match(stdout, 'foo')
})

test('YAML works', async () => {
  assert.equal(YAML.parse(YAML.stringify({ foo: 'bar' })), { foo: 'bar' })
})

test('which() available', async () => {
  assert.is(which.sync('npm'), await which('npm'))
})

test('sleep() works', async () => {
  const now = Date.now()
  await sleep(100)
  assert.ok(Date.now() >= now + 99)
})

test.run()
