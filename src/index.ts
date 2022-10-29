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

import { ProcessPromise } from './core.js'

export {
  $,
  Shell,
  Options,
  ProcessPromise,
  ProcessOutput,
  within,
  cd,
  log,
  LogEntry,
} from './core.js'

export {
  argv,
  chalk,
  echo,
  fetch,
  fs,
  glob,
  globby,
  os,
  path,
  question,
  sleep,
  stdin,
  which,
  YAML,
} from './goods.js'

export { Duration, quote, quotePowerShell } from './util.js'

/**
 *  @deprecated Use $.nothrow() instead.
 */
export function nothrow(promise: ProcessPromise) {
  return promise.nothrow()
}

/**
 * @deprecated Use $.quiet() instead.
 */
export function quiet(promise: ProcessPromise) {
  return promise.quiet()
}
