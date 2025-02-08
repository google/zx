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
import { Readable, Writable } from 'node:stream'
import { expectError, expectType } from 'tsd'
import { $, ProcessPromise, ProcessOutput, within } from 'zx'

let p = $`cmd`
assert(p instanceof ProcessPromise)
expectType<ProcessPromise>(p)
expectType<Writable>(p.stdin)
expectType<Readable>(p.stdout)
expectType<Readable>(p.stderr)
expectType<ProcessPromise>(p.nothrow())
expectType<ProcessPromise>(p.quiet())
expectType<ProcessPromise>(p.pipe($`cmd`))
expectType<ProcessPromise>(p.pipe`cmd`)
expectType<
  typeof process.stdout & PromiseLike<ProcessOutput & typeof process.stdout>
>(p.pipe(process.stdout))
expectType<ProcessPromise>(p.stdio('pipe'))
expectType<ProcessPromise>(p.timeout('1s'))
expectType<Promise<void>>(p.kill())
expectType<Promise<ProcessOutput>>(p.then((p) => p))
expectType<Promise<ProcessOutput>>(p.catch((p) => p))
expectType<Promise<any>>(p.then((p) => p).catch((p) => p))

let o = await p
assert(o instanceof ProcessOutput)
expectType<ProcessOutput>(o)
expectType<string>(o.stdout)
expectType<string>(o.stderr)
expectType<number | null>(o.exitCode)
expectType<NodeJS.Signals | null>(o.signal)
// prettier-ignore
expectType<ProcessOutput>(new ProcessOutput({
  code: null,
  signal: null,
  duration: 0,
  store: { stdout: [], stderr: [], stdall: [] },
  error: null,
  from: ''
}))

expectType<ProcessOutput>(new ProcessOutput(null, null, '', '', '', '', 1))
expectType<ProcessOutput>(new ProcessOutput(null, null, '', '', '', ''))
expectError(new ProcessOutput(null, null))

expectType<'banana'>(within(() => 'apple' as 'banana'))

expectType<ProcessPromise>($`cmd`)
expectType<ProcessPromise>($({ sync: false })`cmd`)
expectType<ProcessOutput>($({ sync: true })`cmd`)
expectType<ProcessOutput>($.sync`cmd`)
