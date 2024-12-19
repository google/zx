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
import assert from 'node:assert'
import { test, describe } from 'node:test'
import '../build/globals.js'

describe('goods', () => {
  function zx(script) {
    return $`node build/cli.js --eval ${script}`.nothrow().timeout('5s')
  }

  test('question() works', async () => {
    const p = $`node build/cli.js --eval "
  let answer = await question('foo or bar? ', { choices: ['foo', 'bar'] })
  echo('Answer is', answer)
"`
    p.stdin.write('foo\n')
    p.stdin.end()
    assert.match((await p).stdout, /Answer is foo/)
  })

  test('globby available', async () => {
    assert.equal(globby, glob)
    assert.equal(typeof globby, 'function')
    assert.equal(typeof globby.globbySync, 'function')
    assert.equal(typeof globby.globbyStream, 'function')
    assert.equal(typeof globby.generateGlobTasks, 'function')
    assert.equal(typeof globby.isDynamicPattern, 'function')
    assert.equal(typeof globby.isGitIgnored, 'function')
    assert.equal(typeof globby.isGitIgnoredSync, 'function')
    assert.deepEqual(await globby('*.md'), ['README.md'])
  })

  test('fetch() works', async () => {
    assert.match(
      await fetch('https://medv.io').then((res) => res.text()),
      /Anton Medvedev/
    )
  })

  test('echo() works', async () => {
    const log = console.log
    let stdout = ''
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
    assert.match(stdout, /foo/)
  })

  test('YAML works', async () => {
    assert.deepEqual(YAML.parse(YAML.stringify({ foo: 'bar' })), { foo: 'bar' })
  })

  test('which() available', async () => {
    assert.equal(which.sync('npm'), await which('npm'))
  })

  test('minimist available', async () => {
    assert.equal(typeof minimist, 'function')
  })

  test('minimist works', async () => {
    assert.deepEqual(
      minimist(
        ['--foo', 'bar', '-a', '5', '-a', '42', '--force', './some.file'],
        { boolean: 'force' }
      ),
      {
        a: [5, 42],
        foo: 'bar',
        force: true,
        _: ['./some.file'],
      }
    )
  })

  test('sleep() works', async () => {
    const now = Date.now()
    await sleep(100)
    assert.ok(Date.now() >= now + 99)
  })

  test('retry() works', async () => {
    const now = Date.now()
    const p = await zx(`
    try {
      await retry(5, '50ms', () => $\`exit 123\`)
    } catch (e) {
      echo('exitCode:', e.exitCode)
    }
    await retry(5, () => $\`exit 0\`)
    echo('success')
`)
    assert.ok(p.toString().includes('exitCode: 123'))
    assert.ok(p.toString().includes('success'))
    assert.ok(Date.now() >= now + 50 * (5 - 1))
  })

  test('retry() with expBackoff() works', async () => {
    const now = Date.now()
    const p = await zx(`
    try {
      await retry(5, expBackoff('60s', 0), () => $\`exit 123\`)
    } catch (e) {
      echo('exitCode:', e.exitCode)
    }
    echo('success')
`)
    assert.ok(p.toString().includes('exitCode: 123'))
    assert.ok(p.toString().includes('success'))
    assert.ok(Date.now() >= now + 2 + 4 + 8 + 16 + 32)
  })

  describe('spinner()', () => {
    test('works', async () => {
      const out = await zx(
        `
    process.env.CI = ''
    echo(await spinner(async () => {
      await sleep(100)
      await $\`echo hidden\`
      return $\`echo result\`
    }))
  `
      )
      assert(out.stdout.includes('result'))
      assert(out.stderr.includes('⠋'))
      assert(!out.stderr.includes('result'))
      assert(!out.stderr.includes('hidden'))
    })

    test('with title', async () => {
      const out = await zx(
        `
    process.env.CI = ''
    await spinner('processing', () => sleep(100))
  `
      )
      assert.match(out.stderr, /processing/)
    })

    test('disabled in CI', async () => {
      const out = await zx(
        `
    process.env.CI = 'true'
    await spinner('processing', () => sleep(100))
  `
      )
      assert.doesNotMatch(out.stderr, /processing/)
    })

    test('stops on throw', async () => {
      const out = await zx(`
    await spinner('processing', () => $\`wtf-cmd\`)
  `)
      assert.match(out.stderr, /Error:/)
      assert(out.exitCode !== 0)
    })
  })
})
