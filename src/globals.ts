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

import * as _ from './index.js'

Object.assign(global, _)

declare global {
  type ProcessPromise = _.ProcessPromise
  type ProcessOutput = _.ProcessOutput
  var ProcessPromise: typeof _.ProcessPromise
  var ProcessOutput: typeof _.ProcessOutput
  var log: typeof _.log
  var $: typeof _.$
  var argv: typeof _.argv
  var cd: typeof _.cd
  var chalk: typeof _.chalk
  var echo: typeof _.echo
  var fs: typeof _.fs
  var glob: typeof _.glob
  var globby: typeof _.globby
  var nothrow: typeof _.nothrow
  var os: typeof _.os
  var path: typeof _.path
  var question: typeof _.question
  var quiet: typeof _.quiet
  var quote: typeof _.quote
  var quotePowerShell: typeof _.quotePowerShell
  var sleep: typeof _.sleep
  var stdin: typeof _.stdin
  var which: typeof _.which
  var within: typeof _.within
  var YAML: typeof _.YAML
}
