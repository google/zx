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

const p = $`npm init`.stdio('pipe')

for await (const chunk of p.stdout) {
  if (chunk.includes('package name:')) p.stdin.write('test\n')
  if (chunk.includes('version:')) p.stdin.write('1.0.0\n')
  if (chunk.includes('description:')) p.stdin.write('My test package\n')
  if (chunk.includes('entry point:')) p.stdin.write('index.mjs\n')
  if (chunk.includes('test command:')) p.stdin.write('test.mjs\n')
  if (chunk.includes('git repository:')) p.stdin.write('my-org/repo\n')
  if (chunk.includes('keywords:')) p.stdin.write('foo, bar\n')
  if (chunk.includes('author:')) p.stdin.write('Anton Medvedev\n')
  if (chunk.includes('license:')) p.stdin.write('MIT\n')
  if (chunk.includes('Is this OK?')) p.stdin.write('yes\n')
}
