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

import { ProcessPromise } from './core.ts'
import { fs } from './vendor.ts'

export * from './core.ts'
export * from './goods.ts'
export { minimist, dotenv, fs, YAML, glob, glob as globby } from './vendor.ts'

export const VERSION: string = fs.readJsonSync(
  new URL('../package.json', import.meta.url),
  { throws: false }
)?.version
export const version: string = VERSION

export {
  type Duration,
  quote,
  quotePowerShell,
  tempdir,
  tempdir as tmpdir,
  tempfile,
  tempfile as tmpfile,
} from './util.ts'

/**
 *  @deprecated Use $`cmd`.nothrow() instead.
 */
export function nothrow(promise: ProcessPromise): ProcessPromise {
  return promise.nothrow()
}

/**
 * @deprecated Use $`cmd`.quiet() instead.
 */
export function quiet(promise: ProcessPromise): ProcessPromise {
  return promise.quiet()
}
