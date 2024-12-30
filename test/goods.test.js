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

import assert from 'node:assert'
import { test, describe, after } from 'node:test'
import { $, chalk, fs, tempfile, dotenv } from '../build/index.js'
import { echo, sleep, parseArgv } from '../build/goods.js'

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

  test('parseArgv() works', () => {
    assert.deepEqual(
      parseArgv(
        // prettier-ignore
        [
          '--foo-bar', 'baz',
          '-a', '5',
          '-a', '42',
          '--aaa', 'AAA',
          '--force',
          './some.file',
          '--b1', 'true',
          '--b2', 'false',
          '--b3',
          '--b4', 'false',
          '--b5', 'true',
          '--b6', 'str'
        ],
        {
          boolean: ['force', 'b3', 'b4', 'b5', 'b6'],
          camelCase: true,
          parseBoolean: true,
          alias: { a: 'aaa' },
        }
      ),
      {
        a: [5, 42, 'AAA'],
        aaa: [5, 42, 'AAA'],
        fooBar: 'baz',
        force: true,
        _: ['./some.file', 'str'],
        b1: true,
        b2: false,
        b3: true,
        b4: false,
        b5: true,
        b6: true,
      }
    )
  })

  describe('dotenv', () => {
    test('parse()', () => {
      assert.deepEqual(dotenv.parse(''), {})
      assert.deepEqual(
        dotenv.parse('ENV=v1\nENV2=v2\n\n\n  ENV3  =    v3   \nexport ENV4=v4'),
        {
          ENV: 'v1',
          ENV2: 'v2',
          ENV3: 'v3',
          ENV4: 'v4',
        }
      )

      const multiline = `SIMPLE=xyz123
# comment ###
NON_INTERPOLATED='raw text without variable interpolation' 
MULTILINE = """
long text here, # not-comment
e.g. a private SSH key
"""
ENV=v1\nENV2=v2\n\n\n\t\t  ENV3  =    v3   \n   export ENV4=v4
ENV5=v5 # comment
`
      assert.deepEqual(dotenv.parse(multiline), {
        SIMPLE: 'xyz123',
        NON_INTERPOLATED: 'raw text without variable interpolation',
        MULTILINE: 'long text here, # not-comment\ne.g. a private SSH key',
        ENV: 'v1',
        ENV2: 'v2',
        ENV3: 'v3',
        ENV4: 'v4',
        ENV5: 'v5',
      })
    })

    describe('load()', () => {
      const file1 = tempfile('.env.1', 'ENV1=value1\nENV2=value2')
      const file2 = tempfile('.env.2', 'ENV2=value222\nENV3=value3')
      after(() => Promise.all([fs.remove(file1), fs.remove(file2)]))

      test('loads env from files', () => {
        const env = dotenv.load(file1, file2)
        assert.equal(env.ENV1, 'value1')
        assert.equal(env.ENV2, 'value2')
        assert.equal(env.ENV3, 'value3')
      })

      test('throws error on ENOENT', () => {
        try {
          dotenv.load('./.env')
          assert.throw()
        } catch (e) {
          assert.equal(e.code, 'ENOENT')
          assert.equal(e.errno, -2)
        }
      })
    })

    describe('loadSafe()', () => {
      const file1 = tempfile('.env.1', 'ENV1=value1\nENV2=value2')
      const file2 = '.env.notexists'

      after(() => fs.remove(file1))

      test('loads env from files', () => {
        const env = dotenv.loadSafe(file1, file2)
        assert.equal(env.ENV1, 'value1')
        assert.equal(env.ENV2, 'value2')
      })
    })

    describe('config()', () => {
      test('updates process.env', () => {
        const file1 = tempfile('.env.1', 'ENV1=value1')

        assert.equal(process.env.ENV1, undefined)
        dotenv.config(file1)
        assert.equal(process.env.ENV1, 'value1')
        delete process.env.ENV1
      })
    })
  })
})
