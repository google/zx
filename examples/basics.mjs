#!/usr/bin/env zx

// Copyright 2021 Google LLC
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

await $`ls -1 | wc -l`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

let branch = await $`git branch --show-current`
await $`printf ${branch} | wc` // The new line trimmed from stdout.

let foo = `hi; echo 'oops'`
await $`echo ${foo} | wc` // Vars properly quoted.

let path = await import('path') // We can use import,
let {name} = require(path.join(__dirname, '..', 'package.json')) // and require.

console.log(chalk.black.bgCyanBright(name)) // The chalk is available without import.

try {
  await $`exit 42` // ProcessOutput will be thrown on non-zero exit codes.
} catch (p) {
  console.log(p.exitCode)
}

let {exitCode} = await nothrow($`exit 42`) // Change behavior to no-throw.
exitCode = await $`exit 42`.exitCode // Or wait on exitCode itself.

// Use combinations of pipe() and nothrow():
await $`find ./examples -type f -print0`
  .pipe(nothrow($`xargs -0 grep ${'missing' + 'part'}`))
  .pipe($`wc -l`)
