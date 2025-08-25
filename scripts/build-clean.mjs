#!/usr/bin/env node

// Copyright 2025 Google LLC
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

import fs from 'node:fs'
import glob from 'fast-glob'

const redundants = await glob(
  ['build/{repl,globals-jsr}.d.ts', 'build/{deps,internals,util,vendor*}.js'],
  {
    onlyFiles: true,
    absolute: true,
  }
)

for (const file of redundants) {
  fs.unlinkSync(file)
}

console.log('postbuild removed', redundants)
