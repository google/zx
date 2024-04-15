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

import { expectType } from 'tsd'
import { $, echo, sleep, spinner, retry, expBackoff } from 'zx'

echo`Date is ${await $`date`}`
echo('Hello, world!')

await sleep('1s')
await sleep(1000)

expectType<'foo'>(await spinner(() => 'foo' as 'foo'))
expectType<'bar'>(await spinner('title', () => 'bar' as 'bar'))
expectType<'foo'>(await retry(0, () => 'foo' as 'foo'))
expectType<Generator<number, void, unknown>>(expBackoff())
