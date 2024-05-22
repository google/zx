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

import * as _ from './index.js';

// Assign global properties directly
globalThis.ProcessPromise = _.ProcessPromise;
globalThis.ProcessOutput = _.ProcessOutput;
globalThis.log = _.log;
globalThis.$ = _.$;
globalThis.argv = _.argv;
globalThis.cd = _.cd;
globalThis.chalk = _.chalk;
globalThis.echo = _.echo;
globalThis.expBackoff = _.expBackoff;
globalThis.fs = _.fs;
globalThis.glob = _.glob;
globalThis.globby = _.globby;
globalThis.kill = _.kill;
globalThis.minimist = _.minimist;
globalThis.nothrow = _.nothrow;
globalThis.os = _.os;
globalThis.path = _.path;
globalThis.question = _.question;
globalThis.quiet = _.quiet;
globalThis.quote = _.quote;
globalThis.quotePowerShell = _.quotePowerShell;
globalThis.retry = _.retry;
globalThis.sleep = _.sleep;
globalThis.spinner = _.spinner;
globalThis.stdin = _.stdin;
globalThis.tempdir = _.tempdir;
globalThis.tempfile = _.tempfile;
globalThis.tmpdir = _.tempdir;
globalThis.tmpfile = _.tempfile;
globalThis.usePowerShell = _.usePowerShell;
globalThis.usePwsh = _.usePwsh;
globalThis.useBash = _.useBash;
globalThis.which = _.which;
globalThis.within = _.within;
globalThis.YAML = _.YAML;

declare global {
  // Type declarations
  type ProcessPromise = typeof _.ProcessPromise;
  type ProcessOutput = typeof _.ProcessOutput;
}
