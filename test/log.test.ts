// Copyright 2025 Google LLC
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
import { test, describe, beforeEach, before, after } from 'node:test'
import { formatCmd, log } from '../src/log.ts'

describe('log', () => {
  describe('log()', () => {
    const data = []
    const stream = {
      write(s: string) {
        data.push(s)
      },
    } as NodeJS.WriteStream

    before(() => (log.output = stream))

    after(() => {
      delete log.output
      delete log.formatters
    })

    beforeEach(() => (data.length = 0))

    test('empty log', () => {
      log({
        kind: 'cmd',
        cmd: 'echo hi',
        cwd: process.cwd(),
        id: '1',
        verbose: false,
      })
      assert.equal(data.join(''), '')
    })

    test('cmd', () => {
      log({
        kind: 'cmd',
        cmd: 'echo hi',
        cwd: process.cwd(),
        id: '1',
        verbose: true,
      })
      assert.equal(data.join(''), '$ \x1B[92mecho\x1B[39m hi\n')
    })

    test('stdout', () => {
      log({
        kind: 'stdout',
        data: Buffer.from('foo'),
        id: '1',
        verbose: true,
      })
      assert.equal(data.join(''), 'foo')
    })

    test('cd', () => {
      log({
        kind: 'cd',
        dir: '/tmp',
        verbose: true,
      })
      assert.equal(data.join(''), '$ \x1B[92mcd\x1B[39m /tmp\n')
    })

    test('fetch', () => {
      log({
        kind: 'fetch',
        url: 'https://github.com',
        init: { method: 'GET' },
        verbose: true,
      })
      assert.equal(
        data.join(''),
        "$ \x1B[92mfetch\x1B[39m https://github.com { method: 'GET' }\n"
      )
    })

    test('custom', () => {
      log({
        kind: 'custom',
        data: 'test',
        verbose: true,
      })
      assert.equal(data.join(''), 'test')
    })

    test('retry', () => {
      log({
        kind: 'retry',
        attempt: 1,
        total: 3,
        delay: 1000,
        exception: new Error('foo'),
        error: 'bar',
        verbose: true,
      })
      assert.equal(
        data.join(''),
        '\x1B[41m\x1B[37m FAIL \x1B[39m\x1B[49m Attempt: 1/3; next in 1000ms\n'
      )
    })

    test('end', () => {
      log({
        kind: 'end',
        id: '1',
        exitCode: null,
        signal: null,
        duration: 0,
        error: null,
        verbose: true,
      })
      assert.equal(data.join(''), '')
    })

    test('kill', () => {
      log({
        kind: 'kill',
        signal: null,
        pid: 1234,
      })
      assert.equal(data.join(''), '')
    })

    test('formatters', () => {
      log.formatters = {
        cmd: ({ cmd }) => `CMD: ${cmd}`,
      }

      log({
        kind: 'cmd',
        cmd: 'echo hi',
        cwd: process.cwd(),
        id: '1',
        verbose: true,
      })
      assert.equal(data.join(''), 'CMD: echo hi')
    })
  })

  test('formatCwd()', () => {
    const cases = [
      [
        `echo $'hi'`,
        "$ \x1B[92mecho\x1B[39m \x1B[93m$\x1B[39m\x1B[93m'hi'\x1B[39m\n",
      ],
      [`echo$foo`, '$ \x1B[92mecho\x1B[39m\x1B[93m$\x1B[39mfoo\n'],
      [
        `test --foo=bar p1 p2`,
        '$ \x1B[92mtest\x1B[39m --foo\x1B[31m=\x1B[39mbar p1 p2\n',
      ],
      [
        `cmd1 --foo || cmd2`,
        '$ \x1B[92mcmd1\x1B[39m --foo \x1B[31m|\x1B[39m\x1B[31m|\x1B[39m\x1B[92m cmd2\x1B[39m\n',
      ],
      [
        `A=B C='D' cmd`,
        "$ A\x1B[31m=\x1B[39mB C\x1B[31m=\x1B[39m\x1B[93m'D'\x1B[39m\x1B[92m cmd\x1B[39m\n",
      ],
      [
        `foo-extra --baz = b-a-z --bar = 'b-a-r' -q -u x`,
        "$ \x1B[92mfoo-extra\x1B[39m --baz \x1B[31m=\x1B[39m b-a-z --bar \x1B[31m=\x1B[39m \x1B[93m'b-a-r'\x1B[39m -q -u x\n",
      ],
      [
        `while true; do "$" done`,
        '$ \x1B[96mwhile\x1B[39m true\x1B[31m;\x1B[39m\x1B[96m do\x1B[39m \x1B[93m"$"\x1B[39m\x1B[96m done\x1B[39m\n',
      ],
      [
        `echo '\n str\n'`,
        "$ \x1B[92mecho\x1B[39m \x1B[93m'\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[93m str\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[93m'\x1B[39m\n",
      ],
      [`$'\\''`, "$ \x1B[93m$\x1B[39m\x1B[93m'\\'\x1B[39m\x1B[93m'\x1B[39m\n"],
      [
        'sass-compiler --style=compressed src/static/bootstrap.scss > dist/static/bootstrap-v5.3.3.min.css',
        '$ \x1B[92msass-compiler\x1B[39m --style\x1B[31m=\x1B[39mcompressed src/static/bootstrap.scss \x1B[31m>\x1B[39m\x1B[92m dist/static/bootstrap-v5.3.3.min.css\x1B[39m\n',
      ],
      [
        'echo 1+2 | bc',
        '$ \x1B[92mecho\x1B[39m 1\x1B[31m+\x1B[39m2 \x1B[31m|\x1B[39m\x1B[92m bc\x1B[39m\n',
      ],
      [
        'echo test &>> filepath',
        '$ \x1B[92mecho\x1B[39m test \x1B[31m&\x1B[39m\x1B[31m>\x1B[39m\x1B[31m>\x1B[39m\x1B[92m filepath\x1B[39m\n',
      ],
      [
        'bc < filepath',
        '$ \x1B[92mbc\x1B[39m \x1B[31m<\x1B[39m\x1B[92m filepath\x1B[39m\n',
      ],
      [
        `cat << 'EOF' | tee -a filepath
line 1
line 2
EOF`,
        "$ \x1B[92mcat\x1B[39m \x1B[31m<\x1B[39m\x1B[31m<\x1B[39m \x1B[93m'EOF'\x1B[39m \x1B[31m|\x1B[39m\x1B[92m tee\x1B[39m -a filepath\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0mline 1\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0mline 2\x1B[96m\x1B[39m\x1B[0m\x1B[0m\n\x1B[0m> \x1B[0m\x1B[96mEOF\x1B[39m\n",
      ],
    ]

    cases.forEach(([input, expected]) => {
      assert.equal(formatCmd(input), expected, input)
    })
  })
})
