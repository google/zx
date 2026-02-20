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
import { Duplex } from 'node:stream'
import { $, chalk, fs, path, dotenv } from '../src/index.ts'
import {
  echo,
  sleep,
  argv,
  parseArgv,
  updateArgv,
  stdin,
  spinner,
  fetch,
  retry,
  question,
  expBackoff,
  tempfile,
  tempdir,
  tmpdir,
  tmpfile,
  versions,
} from '../src/goods.ts'
import { Writable } from 'node:stream'
import process from 'node:process'

const __dirname = new URL('.', import.meta.url).pathname
const root = path.resolve(__dirname, '..')

describe('goods', () => {
  function zx(script) {
    return $`node build/cli.js --eval ${script}`.nothrow().timeout('5s')
  }

  describe('question()', async () => {
    test('works', async () => {
      let contents = ''
      class Input extends Duplex {
        constructor() {
          super()
        }
        _read() {}
        _write(chunk, encoding, callback) {
          this.push(chunk)
          callback()
        }
        _final() {
          this.push(null)
        }
      }
      const input = new Input() as any
      const output = new Writable({
        write: function (chunk, encoding, next) {
          contents += chunk.toString()
          next()
        },
      }) as NodeJS.WriteStream

      setTimeout(() => {
        input.write('foo\n')
        input.end()
      }, 10)
      const result = await question('foo or bar? ', {
        choices: ['foo', 'bar'],
        input,
        output,
      })

      assert.equal(result, 'foo')
      assert(contents.includes('foo or bar? '))
    })

    test('integration', async () => {
      const p = $`node build/cli.js --eval "
  let answer = await question('foo or bar? ', { choices: ['foo', 'bar'] })
  echo('Answer is', answer)
"`
      p.stdin.write('foo\n')
      p.stdin.end()
      assert.match((await p).stdout, /Answer is foo/)
    })
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

  describe('retry()', () => {
    test('works', async () => {
      let count = 0
      const result = await retry(5, () => {
        count++
        if (count < 5) throw new Error('fail')
        return 'success'
      })
      assert.equal(result, 'success')
      assert.equal(count, 5)
    })

    test('works with custom delay and limit', async () => {
      const now = Date.now()
      let count = 0
      try {
        await retry(3, '2ms', () => {
          count++
          throw new Error('fail')
        })
      } catch (e) {
        assert.match(e.message, /fail/)
        assert.ok(Date.now() >= now + 4)
        assert.equal(count, 3)
      }
    })

    test('throws undefined on count misconfiguration', async () => {
      try {
        await retry(0, () => 'ok')
      } catch (e) {
        assert.equal(e, undefined)
      }
    })

    test('throws err on empty callback', async () => {
      try {
        // @ts-ignore
        await retry(5)
      } catch (e) {
        assert.match(e.message, /Callback is required for retry/)
      }
    })

    test('supports expBackoff', async () => {
      const result = await retry(5, expBackoff('10ms'), () => {
        if (Math.random() < 0.1) throw new Error('fail')
        return 'success'
      })

      assert.equal(result, 'success')
    })

    test('integration', async () => {
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

    test('integration with expBackoff', async () => {
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
  })

  test('expBackoff()', async () => {
    const g = expBackoff('10s', '100ms')

    const [a, b, c] = [
      g.next().value,
      g.next().value,
      g.next().value,
    ] as number[]

    assert.equal(a, 100)
    assert.equal(b, 200)
    assert.equal(c, 400)
  })

  describe('spinner()', () => {
    test('works', async () => {
      let contents = ''
      const { CI } = process.env
      const output = new Writable({
        write: function (chunk, encoding, next) {
          contents += chunk.toString()
          next()
        },
      })

      delete process.env.CI
      $.log.output = output as NodeJS.WriteStream

      const p = spinner(() => sleep(100))

      delete $.log.output
      process.env.CI = CI

      await p
      assert(contents.includes('⠋'))
    })

    describe('integration', () => {
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

  describe('args', () => {
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
          },
          {
            def: 'def',
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
          def: 'def',
        }
      )
    })

    test('updateArgv() works', () => {
      updateArgv(['--foo', 'bar'])
      assert.deepEqual(argv, {
        _: [],
        foo: 'bar',
      })
    })
  })

  test('stdin()', async () => {
    const stream = fs.createReadStream(path.resolve(root, 'package.json'))
    const input = await stdin(stream)
    assert.match(input, /"name": "zx"/)
  })

  test('fetch()', async () => {
    const req1 = fetch('https://github.com/')
    const req2 = fetch('https://github.com/')
    const req3 = fetch('https://github.com/', { method: 'OPTIONS' })

    const p1 = (await req1.pipe`cat`).stdout
    const p2 = (await req2.pipe($`cat`)).stdout
    const p3 = (await req3.pipe`cat`).stdout

    assert.equal((await req1).status, 200)
    assert.equal((await req2).status, 200)
    assert.equal((await req3).status, 404)
    assert(p1.includes('GitHub'))
    assert(p2.includes('GitHub'))
    assert(p3.includes('GitHub'))
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
          throw new Error('unreachable')
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

  describe('temp*', () => {
    test('tempdir() creates temporary folders', () => {
      assert.equal(tmpdir, tempdir)
      assert.match(tempdir(), /\/zx-/)
      assert.match(tempdir('foo'), /\/foo$/)
    })

    test('tempfile() creates temporary files', () => {
      assert.equal(tmpfile, tempfile)
      assert.match(tempfile(), /\/zx-.+/)
      assert.match(tempfile('foo.txt'), /\/zx-.+\/foo\.txt$/)

      const tf = tempfile('bar.txt', 'bar')
      assert.match(tf, /\/zx-.+\/bar\.txt$/)
      assert.equal(fs.readFileSync(tf, 'utf-8'), 'bar')
    })
  })

  describe('versions', () => {
    test('exports deps versions', () => {
      assert.deepEqual(
        Object.keys(versions).sort(),
        [
          'chalk',
          'depseek',
          'dotenv',
          'fetch',
          'fs',
          'glob',
          'minimist',
          'ps',
          'which',
          'yaml',
          'zx',
        ].sort()
      )
    })
  })
})
