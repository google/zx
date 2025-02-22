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

import assert from 'node:assert'
import { test, describe, before, after } from 'node:test'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import getPort from 'get-port'
import { $, path, tmpfile, tmpdir, fs } from '../build/index.js'
import { isMain, normalizeExt, transformMarkdown } from '../build/cli.js'

const __filename = fileURLToPath(import.meta.url)
const spawn = $.spawn
const nodeMajor = +process.versions?.node?.split('.')[0]
const test22 = nodeMajor >= 22 ? test : test.skip
const getServer = (resp = [], log = console.log) => {
  const server = net.createServer()
  server.on('connection', (conn) => {
    conn.on('data', (d) => {
      conn.write(resp.shift() || 'pong')
    })
  })
  server.stop = () => new Promise((resolve) => server.close(() => resolve()))
  server.start = (port) =>
    new Promise((resolve) => server.listen(port, () => resolve(server)))
  return server
}

describe('cli', () => {
  // Helps to detect unresolved ProcessPromise.
  before(() => {
    const spawned = []
    $.spawn = (...args) => {
      const proc = spawn(...args)
      const done = () => (proc._done = true)
      spawned.push(proc)
      return proc.once('close', done).once('error', done)
    }
    process.on('exit', () => {
      if (spawned.some((p) => p._done !== true)) {
        console.error('Error: ProcessPromise never resolved.')
        process.exitCode = 1
      }
    })
  })
  after(() => ($.spawn = spawn))

  test('promise resolved', async () => {
    await $`echo`
  })

  test('prints version', async () => {
    assert.match((await $`node build/cli.js -v`).toString(), /\d+.\d+.\d+/)
  })

  test('prints help', async () => {
    const p = $`node build/cli.js -h`
    p.stdin.end()
    const help = await p
    assert.match(help.stdout, /zx/)
  })

  test('zx prints usage if no param passed', async () => {
    const p = $`node build/cli.js`
    p.stdin.end()
    try {
      await p
      assert.fail('must throw')
    } catch (out) {
      assert.match(out.stdout, /A tool for writing better scripts/)
      assert.equal(out.exitCode, 1)
    }
  })

  test('starts repl with --repl', async () => {
    const p = $`node build/cli.js --repl`
    p.stdin.write('await $`echo f"o"o`\n')
    p.stdin.write('"b"+"ar"\n')
    p.stdin.end()
    const out = await p
    assert.match(out.stdout, /foo/)
    assert.match(out.stdout, /bar/)
  })

  test('starts repl with verbosity off', async () => {
    const p = $`node build/cli.js --repl`
    p.stdin.write('"verbose" + " is " + $.verbose\n')
    p.stdin.end()
    const out = await p
    assert.match(out.stdout, /verbose is false/)
  })

  test('supports `--quiet` flag', async () => {
    const p = await $`node build/cli.js --quiet test/fixtures/markdown.md`
    assert.ok(!p.stderr.includes('ignore'), 'ignore was printed')
    assert.ok(!p.stderr.includes('hello'), 'no hello')
    assert.ok(p.stdout.includes('world'), 'no world')
  })

  test('supports `--shell` flag ', async () => {
    const shell = $.shell
    const p =
      await $`node build/cli.js --verbose --shell=${shell} <<< '$\`echo \${$.shell}\`'`
    assert.ok(p.stderr.includes(shell))
  })

  test('supports `--prefix` flag ', async () => {
    const prefix = 'set -e;'
    const p =
      await $`node build/cli.js --verbose --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
    assert.ok(p.stderr.includes(prefix))
  })

  test('supports `--postfix` flag ', async () => {
    const postfix = '; exit 0'
    const p =
      await $`node build/cli.js --verbose --postfix=${postfix} <<< '$\`echo \${$.postfix}\`'`
    assert.ok(p.stderr.includes(postfix))
  })

  test('supports `--cwd` option ', async () => {
    const cwd = path.resolve(fileURLToPath(import.meta.url), '../../temp')
    fs.mkdirSync(cwd, { recursive: true })
    const p =
      await $`node build/cli.js --verbose --cwd=${cwd} <<< '$\`echo \${$.cwd}\`'`
    assert.ok(p.stderr.endsWith(cwd + '\n'))
  })

  test('supports `--env` option', async () => {
    const env = tmpfile(
      '.env',
      `FOO=BAR
      BAR=FOO+`
    )
    const file = `
    console.log((await $\`echo $FOO\`).stdout);
    console.log((await $\`echo $BAR\`).stdout)
    `

    const out = await $`node build/cli.js --env=${env} <<< ${file}`
    fs.remove(env)
    assert.equal(out.stdout, 'BAR\n\nFOO+\n\n')
  })

  test('supports `--env` and `--cwd` options with file', async () => {
    const env = tmpfile(
      '.env',
      `FOO=BAR
      BAR=FOO+`
    )
    const dir = tmpdir()
    const file = `
      console.log((await $\`echo $FOO\`).stdout);
      console.log((await $\`echo $BAR\`).stdout)
      `

    const out =
      await $`node build/cli.js --cwd=${dir} --env=${env}  <<< ${file}`
    fs.remove(env)
    fs.remove(dir)
    assert.equal(out.stdout, 'BAR\n\nFOO+\n\n')
  })

  test('supports handling errors with the `--env` option', async () => {
    const file = `
      console.log((await $\`echo $FOO\`).stdout);
      console.log((await $\`echo $BAR\`).stdout)
      `
    try {
      await $`node build/cli.js --env=./env <<< ${file}`
      fs.remove(env)
      assert.throw()
    } catch (e) {
      assert.equal(e.exitCode, 1)
    }
  })

  test('scripts from https 200', async () => {
    const resp = await fs.readFile(path.resolve('test/fixtures/echo.http'))
    const port = await getPort()
    const server = await getServer([resp]).start(port)
    const out =
      await $`node build/cli.js --verbose http://127.0.0.1:${port}/script.mjs`
    assert.match(out.stderr, /test/)
    await server.stop()
  })

  test('scripts from https 500', async () => {
    const port = await getPort()
    const server = await getServer(['HTTP/1.1 500\n\n']).listen(port)
    const out = await $`node build/cli.js http://127.0.0.1:${port}`.nothrow()
    assert.match(out.stderr, /Error: Can't get/)
    await server.stop()
  })

  test('scripts (md) from https', async () => {
    const resp = await fs.readFile(path.resolve('test/fixtures/md.http'))
    const port = await getPort()
    const server = await getServer([resp]).start(port)
    const out =
      await $`node build/cli.js --verbose http://127.0.0.1:${port}/script.md`
    assert.match(out.stderr, /md/)
    await server.stop()
  })

  test('scripts with no extension', async () => {
    await $`node build/cli.js test/fixtures/no-extension`
    assert.ok(
      /Test file to verify no-extension didn't overwrite similarly name .mjs file./.test(
        (await fs.readFile('test/fixtures/no-extension.mjs')).toString()
      )
    )
  })

  test('scripts with non standard extension', async () => {
    const o =
      await $`node build/cli.js --ext='.mjs' test/fixtures/non-std-ext.zx`
    assert.ok(o.stdout.trim().endsWith('zx/test/fixtures/non-std-ext.zx.mjs'))

    await assert.rejects(
      $`node build/cli.js test/fixtures/non-std-ext.zx`,
      /Unknown file extension "\.zx"/
    )
  })

  test22('scripts from stdin with explicit extension', async () => {
    const out =
      await $`node --experimental-strip-types build/cli.js --ext='.ts' <<< 'const foo: string = "bar"; console.log(foo)'`
    assert.match(out.stdout, /bar/)
  })

  test('require() is working from stdin', async () => {
    const out =
      await $`node build/cli.js <<< 'console.log(require("./package.json").name)'`
    assert.match(out.stdout, /zx/)
  })

  test('require() is working in ESM', async () => {
    await $`node build/cli.js test/fixtures/require.mjs`
  })

  test('__filename & __dirname are defined', async () => {
    await $`node build/cli.js test/fixtures/filename-dirname.mjs`
  })

  test('markdown scripts are working', async () => {
    await $`node build/cli.js test/fixtures/markdown.md`
  })

  test('markdown scripts are working for CRLF', async () => {
    const p = await $`node build/cli.js test/fixtures/markdown-crlf.md`
    assert.ok(p.stdout.includes('Hello, world!'))
  })

  test('exceptions are caught', async () => {
    const out1 = await $`node build/cli.js <<<${'await $`wtf`'}`.nothrow()
    const out2 = await $`node build/cli.js <<<'throw 42'`.nothrow()
    assert.match(out1.stderr, /Error:/)
    assert.match(out2.stderr, /42/)
  })

  test('eval works', async () => {
    assert.equal((await $`node build/cli.js --eval 'echo(42)'`).stdout, '42\n')
    assert.equal((await $`node build/cli.js -e='echo(69)'`).stdout, '69\n')
  })

  test('eval works with stdin', async () => {
    const p = $`(printf foo; sleep 0.1; printf bar) | node build/cli.js --eval 'echo(await stdin())'`
    assert.equal((await p).stdout, 'foobar\n')
  })

  test('executes a script from $PATH', async () => {
    const isWindows = process.platform === 'win32'
    const oldPath = process.env.PATH
    const toPOSIXPath = (_path) => _path.split(path.sep).join(path.posix.sep)

    const zxPath = path.resolve('./build/cli.js')
    const zxLocation = isWindows ? toPOSIXPath(zxPath) : zxPath
    const scriptCode = `#!/usr/bin/env ${zxLocation}\nconsole.log('The script from path runs.')`
    const scriptName = 'script-from-path'
    const scriptFile = tmpfile(scriptName, scriptCode, 0o744)
    const scriptDir = path.dirname(scriptFile)

    const envPathSeparator = isWindows ? ';' : ':'
    process.env.PATH += envPathSeparator + scriptDir

    try {
      await $`chmod +x ${zxLocation}`
      await $`${scriptName}`
    } finally {
      process.env.PATH = oldPath
      await fs.rm(scriptFile)
    }
  })

  test('argv works with zx and node', async () => {
    assert.equal(
      (await $`node build/cli.js test/fixtures/argv.mjs foo`).toString(),
      `global {"_":["foo"]}\nimported {"_":["foo"]}\n`
    )
    assert.equal(
      (await $`node test/fixtures/argv.mjs bar`).toString(),
      `global {"_":["bar"]}\nimported {"_":["bar"]}\n`
    )
    assert.equal(
      (
        await $`node build/cli.js --eval 'console.log(argv._.join(''))' baz`
      ).toString(),
      `baz\n`
    )
  })

  test('exit code can be set', async () => {
    const p = await $`node build/cli.js test/fixtures/exit-code.mjs`.nothrow()
    assert.equal(p.exitCode, 42)
  })

  describe('internals', () => {
    test('isMain() checks process entry point', () => {
      assert.equal(isMain(import.meta.url, __filename), true)

      assert.equal(
        isMain(import.meta.url.replace('.js', '.cjs'), __filename),
        true
      )

      try {
        assert.equal(
          isMain(
            'file:///root/zx/test/cli.test.js',
            '/root/zx/test/all.test.js'
          ),
          true
        )
        assert.throw()
      } catch (e) {
        assert.ok(['EACCES', 'ENOENT'].includes(e.code))
      }
    })

    test('transformMarkdown()', () => {
      // prettier-ignore
      assert.equal(transformMarkdown(`
# Title
    
~~~js
await $\`echo "js"\`
~~~

typescript code block
~~~~~ts
await $\`echo "ts"\`
~~~~~

~~~
unknown code block
~~~

`), `// 
// # Title
//     

await $\`echo "js"\`

// 
// typescript code block

await $\`echo "ts"\`

// 

// unknown code block

// 
// `)
    })

    test('normalizeExt()', () => {
      assert.equal(normalizeExt('.ts'), '.ts')
      assert.equal(normalizeExt('ts'), '.ts')
      assert.equal(normalizeExt('.'), '.')
      assert.equal(normalizeExt(), undefined)
    })
  })
})
