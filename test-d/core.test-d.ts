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
import { expectType } from 'tsd'
import { $, ProcessPromise, ProcessOutput, within } from '../src/core.js'

let p = $`cmd`
assert(p instanceof ProcessPromise)
expectType<ProcessPromise>(p)
expectType<Writable>(p.stdin)
expectType<Readable>(p.stdout)
expectType<Readable>(p.stderr)
expectType<ProcessPromise>(p.nothrow())
expectType<ProcessPromise>(p.quiet())
expectType<ProcessPromise>(p.pipe($`cmd`))
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

expectType<'banana'>(within(() => 'apple' as 'banana'))
