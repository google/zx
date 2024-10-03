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
import { test, describe, before, after, it } from 'node:test'
import { inspect } from 'node:util'
import { basename } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { Socket } from 'node:net'
import { ProcessPromise, ProcessOutput } from '../build/index.js'
import '../build/globals.js'

describe('core', () => {
  describe('$', () => {
    test('is a regular function', async () => {
      const _$ = $.bind(null)
      let foo = await _$`echo foo`
      assert.equal(foo.stdout, 'foo\n')
      assert.ok(typeof $.call === 'function')
      assert.ok(typeof $.apply === 'function')
    })

    test('only stdout is used during command substitution', async () => {
      let hello = await $`echo Error >&2; echo Hello`
      let len = +(await $`echo ${hello} | wc -c`)
      assert.equal(len, 6)
    })

    test('env vars works', async () => {
      process.env.ZX_TEST_FOO = 'foo'
      let foo = await $`echo $ZX_TEST_FOO`
      assert.equal(foo.stdout, 'foo\n')
    })

    test('env vars are safe to pass', async () => {
      process.env.ZX_TEST_BAR = 'hi; exit 1'
      const bar = await $`echo $ZX_TEST_BAR`
      assert.equal(bar.stdout, 'hi; exit 1\n')
    })

    test('arguments are quoted', async () => {
      let bar = 'bar"";baz!$#^$\'&*~*%)({}||\\/'
      assert.equal((await $`echo ${bar}`).stdout.trim(), bar)
    })

    test('undefined and empty string correctly quoted', async () => {
      assert.equal((await $`echo -n ${undefined}`).toString(), 'undefined')
      assert.equal((await $`echo -n ${''}`).toString(), '')
    })

    test.skip('handles multiline literals', async () => {
      assert.equal(
        (
          await $`echo foo
     bar
     "baz
      qux"
`
        ).toString(),
        'foo bar baz\n      qux\n'
      )
      assert.equal(
        (
          await $`echo foo \
                     bar \
                     baz \
`
        ).toString(),
        'foo bar baz\n'
      )
    })

    test('can create a dir with a space in the name', async () => {
      let name = 'foo bar'
      try {
        await $`mkdir /tmp/${name}`
      } catch {
        assert.unreachable()
      } finally {
        await fs.rmdir('/tmp/' + name)
      }
    })

    test('pipefail is on', async () => {
      let p
      try {
        p = await $`cat /dev/not_found | sort`
      } catch (e) {
        p = e
      }
      assert.notEqual(p.exitCode, 0)
    })

    test('toString() is called on arguments', async () => {
      let foo = 0
      let p = await $`echo ${foo}`
      assert.equal(p.stdout, '0\n')
    })

    test('can use array as an argument', async () => {
      let args = ['-n', 'foo']
      assert.equal((await $`echo ${args}`).toString(), 'foo')
    })

    test('requires $.shell to be specified', async () => {
      await within(() => {
        $.shell = undefined
        assert.throws(() => $`echo foo`, /shell/)
      })
    })

    test('malformed cmd error', async () => {
      assert.throws(() => $`\033`, /malformed/i)
    })

    test('snapshots works', async () => {
      await within(async () => {
        $.prefix += 'echo success;'
        let p = $`:`
        $.prefix += 'echo fail;'
        let out = await p
        assert.equal(out.stdout, 'success\n')
        assert.doesNotMatch(out.stdout, /fail/)
      })
    })

    test('$ thrown as error', async () => {
      let err
      try {
        await $`wtf`
      } catch (p) {
        err = p
      }
      assert.ok(err.exitCode > 0)
      assert.ok(err.stderr.includes('wtf: command not found'))
      assert.ok(err[inspect.custom]().includes('Command not found'))
    })

    test('error event is handled', async () => {
      await within(async () => {
        $.cwd = 'wtf'
        try {
          await $`pwd`
          assert.unreachable('should have thrown')
        } catch (err) {
          assert.ok(err instanceof ProcessOutput)
          assert.match(err.message, /No such file or directory/)
        }
      })
    })

    test('await $`cmd`.exitCode does not throw', async () => {
      assert.notEqual(await $`grep qwerty README.md`.exitCode, 0)
      assert.equal(await $`[[ -f README.md ]]`.exitCode, 0)
    })

    test('`$.sync()` provides synchronous API', () => {
      const o1 = $.sync`echo foo`
      const o2 = $({ sync: true })`echo foo`
      const o3 = $.sync({})`echo foo`
      assert.equal(o1.stdout, 'foo\n')
      assert.equal(o2.stdout, 'foo\n')
      assert.equal(o3.stdout, 'foo\n')
    })

    describe('$({opts}) API', () => {
      test('provides presets', async () => {
        const $1 = $({ nothrow: true })
        assert.equal((await $1`exit 1`).exitCode, 1)

        const $2 = $1({ sync: true })
        assert.equal($2`exit 2`.exitCode, 2)

        const $3 = $({ sync: true })({ nothrow: true })
        assert.equal($3`exit 3`.exitCode, 3)
      })

      test('handles `input` option', async () => {
        const p1 = $({ input: 'foo' })`cat`
        const p2 = $({ input: Readable.from('bar') })`cat`
        const p3 = $({ input: Buffer.from('baz') })`cat`
        const p4 = $({ input: p3 })`cat`
        const p5 = $({ input: await p3 })`cat`

        assert.equal((await p1).stdout, 'foo')
        assert.equal((await p2).stdout, 'bar')
        assert.equal((await p3).stdout, 'baz')
        assert.equal((await p4).stdout, 'baz')
        assert.equal((await p5).stdout, 'baz')
      })

      test('handles `timeout` and `timeoutSignal`', async () => {
        let exitCode, signal
        try {
          await $({
            timeout: 10,
            timeoutSignal: 'SIGKILL',
          })`sleep 999`
        } catch (p) {
          exitCode = p.exitCode
          signal = p.signal
        }
        assert.equal(exitCode, null)
        assert.equal(signal, 'SIGKILL')
      })

      test('`env` option', async () => {
        const baz = await $({
          env: { ZX_TEST_BAZ: 'baz' },
        })`echo $ZX_TEST_BAZ`
        assert.equal(baz.stdout, 'baz\n')
      })

      test('`preferLocal` preserves env', async () => {
        const cases = [
          [true, `${process.cwd()}/node_modules/.bin:${process.cwd()}:`],
          ['/foo', `/foo/node_modules/.bin:/foo:`],
          [
            ['/bar', '/baz'],
            `/bar/node_modules/.bin:/bar:/baz/node_modules/.bin:/baz`,
          ],
        ]

        for (const [preferLocal, expected] of cases) {
          const path = await $({
            preferLocal,
            env: { PATH: process.env.PATH },
          })`echo $PATH`
          assert(path.stdout.startsWith(expected))
        }
      })

      test('supports custom intermediate store', async () => {
        const getFixedSizeArray = (size) => {
          const arr = []
          return new Proxy(arr, {
            get: (target, prop) =>
              prop === 'push' && arr.length >= size
                ? () => {
                    /* noop */
                  }
                : target[prop],
          })
        }
        const store = {
          stdout: getFixedSizeArray(1),
          stderr: getFixedSizeArray(1),
          stdall: getFixedSizeArray(0),
        }

        const p = await $({ store })`echo foo`

        assert.equal(p.stdout.trim(), 'foo')
        assert.equal(p.toString(), '')
      })
    })

    test('accepts `stdio`', async () => {
      let p = $({ stdio: 'ignore' })`echo foo`

      assert.equal((await p).stdout, '')
    })
  })

  describe('ProcessPromise', () => {
    test('inherits native Promise', async () => {
      const p1 = $`echo 1`
      const p2 = p1.then((v) => v)
      const p3 = p2.then((v) => v)
      const p4 = p3.catch((v) => v)
      const p5 = p1.finally((v) => v)

      assert(p1 instanceof Promise)
      assert(p1 instanceof ProcessPromise)
      assert(p2 instanceof ProcessPromise)
      assert(p3 instanceof ProcessPromise)
      assert(p4 instanceof ProcessPromise)
      assert(p5 instanceof ProcessPromise)
      assert.ok(p1 !== p2)
      assert.ok(p2 !== p3)
      assert.ok(p3 !== p4)
      assert.ok(p5 !== p1)
    })

    test('resolves with ProcessOutput', async () => {
      const o = await $`echo foo`
      assert.ok(o instanceof ProcessOutput)
    })

    test('cmd() returns cmd to exec', () => {
      const foo = '#bar'
      const baz = 1
      const p = $`echo ${foo} --t ${baz}`
      assert.equal(p.cmd, "echo $'#bar' --t 1")
    })

    test('exposes pid', () => {
      const p = $`echo foo`
      assert.ok(p.pid > 0)
    })

    test('stdio() works', async () => {
      let p = $`printf foo`
      await p
      // assert.throws(() => p.stdin)
      assert.equal((await p).stdout, 'foo')
      let b = $`read; printf $REPLY`
      b.stdin.write('bar\n')
      assert.equal((await b).stdout, 'bar')
    })

    describe('pipe() API', () => {
      test('accepts Writable', async () => {
        let contents = ''
        let stream = new Writable({
          write: function (chunk, encoding, next) {
            contents += chunk.toString()
            next()
          },
        })
        let p = $`echo 'test'`.pipe(stream)
        await p
        assert.ok(p._piped)
        assert.equal(contents, 'test\n')
        assert.ok(p.stderr instanceof Socket)
      })

      test('accepts WriteStream', async () => {
        try {
          await $`echo foo`.pipe(fs.createWriteStream('/tmp/output.txt'))
          assert.equal(
            (await fs.readFile('/tmp/output.txt')).toString(),
            'foo\n'
          )

          let r = $`cat`
          fs.createReadStream('/tmp/output.txt').pipe(r.stdin)
          assert.equal((await r).stdout, 'foo\n')
        } finally {
          await fs.rm('/tmp/output.txt')
        }
      })

      test('accepts ProcessPromise', async () => {
        const p = await $`echo foo`.pipe($`cat`)
        assert.equal(p.stdout.trim(), 'foo')
      })

      test('accepts $ template literal', async () => {
        const p = await $`echo foo`.pipe`cat`
        assert.equal(p.stdout.trim(), 'foo')
      })

      test('accepts stdout', async () => {
        const p1 = $`echo pipe-to-stdout`
        const p2 = p1.pipe(process.stdout)
        assert.equal(p1, p2)
        assert.equal((await p1).stdout.trim(), 'pipe-to-stdout')
      })

      test('checks argument type', async () => {
        let err
        try {
          $`echo 'test'`.pipe('str')
        } catch (p) {
          err = p
        }
        assert.equal(
          err.message,
          'The pipe() method does not take strings. Forgot $?'
        )
      })

      test('is chainable', async () => {
        let { stdout: o1 } = await $`echo "hello"`
          .pipe($`awk '{print $1" world"}'`)
          .pipe($`tr '[a-z]' '[A-Z]'`)
        assert.equal(o1, 'HELLO WORLD\n')

        let { stdout: o2 } = await $`echo "hello"`
          .pipe`awk '{print $1" world"}'`.pipe`tr '[a-z]' '[A-Z]'`
        assert.equal(o2, 'HELLO WORLD\n')
      })

      it('supports multipiping', async () => {
        const result = $`echo 1; sleep 1; echo 2; sleep 1; echo 3`
        const piped1 = result.pipe`cat`
        let piped2

        setTimeout(() => {
          piped2 = result.pipe`cat`
        }, 1500)

        await piped1
        assert.equal((await piped1).toString(), '1\n2\n3\n')
        assert.equal((await piped2).toString(), '1\n2\n3\n')
      })

      test('propagates rejection', async () => {
        const p1 = $`exit 1`
        const p2 = p1.pipe($`echo hello`)

        try {
          await p1
        } catch (e) {
          assert.equal(e.exitCode, 1)
        }

        try {
          await p2
        } catch (e) {
          assert.equal(e.exitCode, 1)
        }

        const p3 = await $({ nothrow: true })`echo hello && exit 1`.pipe($`cat`)
        assert.equal(p3.exitCode, 0)
        assert.equal(p3.stdout.trim(), 'hello')

        const p4 = $`exit 1`.pipe($`echo hello`)
        try {
          await p4
        } catch (e) {
          assert.equal(e.exitCode, 1)
        }

        const p5 = $`echo foo && exit 1`
        const [r1, r2] = await Promise.allSettled([
          p5.pipe($({ nothrow: true })`cat`),
          p5.pipe($`cat`),
        ])
        assert.equal(r1.value.exitCode, 0)
        assert.equal(r2.reason.exitCode, 1)
      })
    })

    describe('abort()', () => {
      test('just works', async () => {
        const p = $({ detached: true })`sleep 999`
        setTimeout(() => p.abort(), 100)

        try {
          await p
          assert.unreachable('should have thrown')
        } catch ({ message }) {
          assert.match(message, /The operation was aborted/)
        }
      })

      test('accepts optional AbortController', async () => {
        const ac = new AbortController()
        const p = $({ ac, detached: true })`sleep 999`
        setTimeout(() => ac.abort(), 100)

        try {
          await p
          assert.unreachable('should have thrown')
        } catch ({ message }) {
          assert.match(message, /The operation was aborted/)
        }
      })

      test('accepts AbortController `signal` separately', async () => {
        const ac = new AbortController()
        const signal = ac.signal
        const p = $({ signal, detached: true })`sleep 999`
        setTimeout(() => ac.abort(), 100)

        try {
          await p
          assert.unreachable('should have thrown')
        } catch ({ message }) {
          assert.match(message, /The operation was aborted/)
        }
      })

      test('exposes `signal` property', async () => {
        const ac = new AbortController()
        const p = $({ ac, detached: true })`echo test`

        assert.equal(p.signal, ac.signal)
        await p
      })

      test('throws if the signal was previously aborted', async () => {
        const ac = new AbortController()
        const { signal } = ac
        ac.abort('reason')

        try {
          await $({ signal, detached: true })`sleep 999`
        } catch ({ message }) {
          assert.match(message, /The operation was aborted/)
        }
      })

      test('throws if the signal is controlled by another process', async () => {
        const ac = new AbortController()
        const { signal } = ac
        const p = $({ signal })`sleep 999`

        try {
          p.abort()
        } catch ({ message }) {
          assert.match(message, /The signal is controlled by another process./)
        }

        try {
          ac.abort()
          await p
        } catch ({ message }) {
          assert.match(message, /The operation was aborted/)
        }
      })
    })

    describe('kill()', () => {
      test('just works', async () => {
        const p = $`sleep 999`.nothrow()
        setTimeout(() => {
          p.kill()
        }, 100)
        const o = await p
        assert.equal(o.signal, 'SIGTERM')
        assert.ok(o.duration >= 100 && o.duration < 1000)
      })

      test('a signal is passed with kill() method', async () => {
        let p = $`while true; do :; done`
        setTimeout(() => p.kill('SIGKILL'), 100)
        let signal
        try {
          await p
        } catch (p) {
          signal = p.signal
        }
        assert.equal(signal, 'SIGKILL')
      })
    })

    test('quiet() mode is working', async () => {
      let stdout = ''
      let log = console.log
      console.log = (...args) => {
        stdout += args.join(' ')
      }
      await $`echo 'test'`.quiet()
      console.log = log
      assert.equal(stdout, '')
      {
        // Deprecated.
        let stdout = ''
        let log = console.log
        console.log = (...args) => {
          stdout += args.join(' ')
        }
        await quiet($`echo 'test'`)
        console.log = log
        assert.equal(stdout, '')
      }
    })

    test('verbose() mode is working', async () => {
      const p = $`echo 'test'`
      assert.equal(p.isVerbose(), false)

      p.verbose()
      assert.equal(p.isVerbose(), true)

      p.verbose(false)
      assert.equal(p.isVerbose(), false)
    })

    test('nothrow() do not throw', async () => {
      let { exitCode } = await $`exit 42`.nothrow()
      assert.equal(exitCode, 42)
      {
        // Deprecated.
        let { exitCode } = await nothrow($`exit 42`)
        assert.equal(exitCode, 42)
      }
    })

    describe('halt()', () => {
      test('just works', async () => {
        let filepath = `/tmp/${Math.random().toString()}`
        let p = $`touch ${filepath}`.halt()
        await sleep(1)
        assert.ok(
          !fs.existsSync(filepath),
          'The cmd called, but it should not have been called'
        )
        await p.run()
        assert.ok(fs.existsSync(filepath), 'The cmd should have been called')
      })

      test('await on halted throws', async () => {
        let p = $({ halt: true })`sleep 1` //.halt()
        let ok = true
        try {
          await p
          ok = false
        } catch (err) {
          assert.equal(err.message, 'The process is halted!')
        }
        assert.ok(ok, 'Expected failure!')
      })
    })

    describe('timeout()', () => {
      test('expiration works', async () => {
        let exitCode, signal
        try {
          await $`sleep 1`.timeout(999)
        } catch (p) {
          exitCode = p.exitCode
          signal = p.signal
        }
        assert.equal(exitCode, undefined)
        assert.equal(signal, undefined)
      })

      test('accepts a signal opt', async () => {
        let exitCode, signal
        try {
          await $`sleep 999`.timeout(10, 'SIGKILL')
        } catch (p) {
          exitCode = p.exitCode
          signal = p.signal
        }
        assert.equal(exitCode, null)
        assert.equal(signal, 'SIGKILL')
      })
    })

    test('json()', async () => {
      assert.deepEqual(await $`echo '{"key":"value"}'`.json(), { key: 'value' })
    })

    test('text()', async () => {
      const p = $`echo foo`
      assert.equal(await p.text(), 'foo\n')
      assert.equal(await p.text('hex'), '666f6f0a')
    })

    test('lines()', async () => {
      const p1 = $`echo 'foo\nbar\r\nbaz'`
      assert.deepEqual(await p1.lines(), ['foo', 'bar', 'baz'])

      const p2 = $.sync`echo 'foo\nbar\r\nbaz'`
      console.log('p2', p2)
      assert.deepEqual(p2.lines(), ['foo', 'bar', 'baz'])
    })

    test('buffer()', async () => {
      assert.equal(
        (await $`echo foo`.buffer()).compare(Buffer.from('foo\n', 'utf-8')),
        0
      )
    })

    test('blob()', async () => {
      const p = $`echo foo`
      assert.equal(await (await p.blob()).text(), 'foo\n')
    })
  })

  describe('ProcessOutput', () => {
    test('getters', async () => {
      const o = new ProcessOutput(-1, 'SIGTERM', '', '', 'foo\n', 'msg', 20)

      assert.equal(o.stdout, '')
      assert.equal(o.stderr, '')
      assert.equal(o.signal, 'SIGTERM')
      assert.equal(o.exitCode, -1)
      assert.equal(o.duration, 20)
    })

    test('toString()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\n')
      assert.equal(o.toString(), 'foo\n')
    })

    test('valueOf()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\n')
      assert.equal(o.valueOf(), 'foo')
      assert.ok(o == 'foo')
    })

    test('json()', async () => {
      const o = new ProcessOutput(null, null, '', '', '{"key":"value"}')
      assert.deepEqual(o.json(), { key: 'value' })
    })

    test('text()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\n')
      assert.equal(o.text(), 'foo\n')
      assert.equal(o.text('hex'), '666f6f0a')
    })

    test('lines()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\nbar\r\nbaz\n')
      assert.deepEqual(o.lines(), ['foo', 'bar', 'baz'])
    })

    test('buffer()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\n')
      assert.equal(o.buffer().compare(Buffer.from('foo\n', 'utf-8')), 0)
    })

    test('blob()', async () => {
      const o = new ProcessOutput(null, null, '', '', 'foo\n')
      assert.equal(await o.blob().text(), 'foo\n')

      const { Blob } = globalThis
      globalThis.Blob = undefined
      assert.throws(() => o.blob(), /Blob is not supported/)
      globalThis.Blob = Blob
    })
  })

  describe('cd()', () => {
    test('works with relative paths', async () => {
      let cwd = process.cwd()
      try {
        fs.mkdirpSync('/tmp/zx-cd-test/one/two')
        cd('/tmp/zx-cd-test/one/two')
        let p1 = $`pwd`
        assert.equal($.cwd, undefined)
        assert.ok(process.cwd().endsWith('/two'))

        cd('..')
        let p2 = $`pwd`
        assert.equal($.cwd, undefined)
        assert.ok(process.cwd().endsWith('/one'))

        cd('..')
        let p3 = $`pwd`
        assert.equal($.cwd, undefined)
        assert.ok(process.cwd().endsWith('/tmp/zx-cd-test'))

        const results = (await Promise.all([p1, p2, p3])).map((p) =>
          path.basename(p.stdout.trim())
        )
        assert.deepEqual(results, ['two', 'one', 'zx-cd-test'])
      } catch (e) {
        assert.ok(!e, e)
      } finally {
        fs.rmSync('/tmp/zx-cd-test', { recursive: true })
        cd(cwd)
      }
    })

    test('does not affect parallel contexts ($.cwdSyncHook enabled)', async () => {
      syncProcessCwd()
      const cwd = process.cwd()
      try {
        fs.mkdirpSync('/tmp/zx-cd-parallel/one/two')
        await Promise.all([
          within(async () => {
            assert.equal(process.cwd(), cwd)
            cd('/tmp/zx-cd-parallel/one')
            await sleep(Math.random() * 15)
            assert.ok(process.cwd().endsWith('/tmp/zx-cd-parallel/one'))
          }),
          within(async () => {
            assert.equal(process.cwd(), cwd)
            await sleep(Math.random() * 15)
            assert.equal(process.cwd(), cwd)
          }),
          within(async () => {
            assert.equal(process.cwd(), cwd)
            await sleep(Math.random() * 15)
            $.cwd = '/tmp/zx-cd-parallel/one/two'
            assert.equal(process.cwd(), cwd)
            assert.ok(
              (await $`pwd`).stdout
                .toString()
                .trim()
                .endsWith('/tmp/zx-cd-parallel/one/two')
            )
          }),
        ])
      } catch (e) {
        assert.ok(!e, e)
      } finally {
        fs.rmSync('/tmp/zx-cd-parallel', { recursive: true })
        cd(cwd)
        syncProcessCwd(false)
      }
    })

    test('fails on entering not existing dir', async () => {
      assert.throws(() => cd('/tmp/abra-kadabra'))
    })

    test('accepts ProcessOutput in addition to string', async () => {
      await within(async () => {
        const tmpDir = await $`mktemp -d`
        cd(tmpDir)
        assert.equal(
          basename(process.cwd()),
          basename(tmpDir.toString().trimEnd())
        )
      })
    })
  })

  describe('within()', () => {
    test('just works', async () => {
      let resolve, reject
      let promise = new Promise((...args) => ([resolve, reject] = args))

      function yes() {
        assert.equal($.verbose, true)
        resolve()
      }

      assert.equal($.verbose, false)

      within(() => {
        $.verbose = true
      })
      assert.equal($.verbose, false)

      within(async () => {
        $.verbose = true
        setTimeout(yes, 10)
      })
      assert.equal($.verbose, false)

      await promise
    })

    test('keeps the cwd ref for internal $ calls', async () => {
      let resolve, reject
      let promise = new Promise((...args) => ([resolve, reject] = args))
      let cwd = process.cwd()
      let pwd = await $`pwd`

      within(async () => {
        cd('/tmp')
        assert.ok(process.cwd().endsWith('/tmp'))
        assert.ok((await $`pwd`).stdout.trim().endsWith('/tmp'))

        setTimeout(async () => {
          process.chdir('/')
          assert.ok((await $`pwd`).stdout.trim().endsWith('/tmp'))
          resolve()
          process.chdir(cwd)
        }, 1000)
      })

      assert.equal((await $`pwd`).stdout, pwd.stdout)
      await promise
    })

    test(`isolates nested context and returns cb result`, async () => {
      within(async () => {
        const res = await within(async () => {
          $.verbose = true

          return within(async () => {
            assert.equal($.verbose, true)
            $.verbose = false

            return within(async () => {
              assert.equal($.verbose, false)
              $.verbose = true
              return 'foo'
            })
          })
        })
        assert.equal($.verbose, false)
        assert.equal(res, 'foo')
      })
    })
  })

  describe('shell presets', () => {
    const originalWhichSync = which.sync
    before(() => {
      which.sync = (bin) => bin
    })
    after(() => {
      which.sync = originalWhichSync
      useBash()
    })

    test('usePwsh()', () => {
      usePwsh()
      assert.equal($.shell, 'pwsh')
      assert.equal($.prefix, '')
      assert.equal($.postfix, '; exit $LastExitCode')
      assert.equal($.quote, quotePowerShell)
    })

    test('usePowerShell()', () => {
      usePowerShell()
      assert.equal($.shell, 'powershell.exe')
      assert.equal($.prefix, '')
      assert.equal($.postfix, '; exit $LastExitCode')
      assert.equal($.quote, quotePowerShell)
    })

    test('useBash()', () => {
      useBash()
      assert.equal($.shell, 'bash')
      assert.equal($.prefix, 'set -euo pipefail;')
      assert.equal($.postfix, '')
      assert.equal($.quote, quote)
    })
  })
})
