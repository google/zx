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

let branch = await $`git branch --show-current`
await $`printf ${branch} | wc` // The new line trimmed from stdout.

let foo = `hi; echo 'oops'`
await $`echo ${foo} | wc` // Vars properly quoted.

// We can use import and require together.
let path = await import('path')
let {name} = require(path.join(__dirname, '..', 'package.json'))
console.log(chalk.black.bgCyanBright(name))
