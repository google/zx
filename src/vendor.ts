// Copyright 2024 Google LLC
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

import { bus } from './vendor-core.js'
import {
  depseek as _depseek,
  dotenv as _dotenv,
  type minimist as TMinimistNamespace,
  minimist as _minimist,
  fs as _fs,
  YAML as _YAML,
  glob as _glob,
  nodeFetch as _nodeFetch,
} from './vendor-extra.js'

export * from './vendor-core.js'
export { createRequire } from './vendor-extra.js'

const { wrap } = bus
export const depseek: typeof _depseek = wrap('depseek', _depseek)
export const dotenv: typeof _dotenv = wrap('dotenv', _dotenv)
export const fs: typeof _fs = wrap('fs', _fs)
export const YAML: typeof _YAML = wrap('YAML', _YAML)
export const glob: typeof _glob = wrap('glob', _glob)
export const nodeFetch: typeof _nodeFetch = wrap('nodeFetch', _nodeFetch)

export const minimist: typeof _minimist = wrap('minimist', _minimist)
export namespace minimist {
  export type Opts = TMinimistNamespace.Opts
  export type ParsedArgs = TMinimistNamespace.ParsedArgs
}
