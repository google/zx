#!/usr/bin/env yzx

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


let {stdin, stdout} = $`npm init`

let put = text => {
  stdin.write(text)
  process.stdout.write(text)
}

for await (let chunk of stdout) {
  if (chunk.includes('package name:')) put('test\n')
  if (chunk.includes('version:')) put('1.0.0\n')
  if (chunk.includes('description:')) put('My test package\n')
  if (chunk.includes('entry point:')) put('index.mjs\n')
  if (chunk.includes('test command:')) put('test.mjs\n')
  if (chunk.includes('git repository:')) put('my-org/repo\n')
  if (chunk.includes('keywords:')) put('foo, bar\n')
  if (chunk.includes('author:')) put('Anton Medvedev\n')
  if (chunk.includes('license:')) put('MIT\n')
  if (chunk.includes('Is this OK?')) put('yes\n')
}
