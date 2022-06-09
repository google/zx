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

const username = await question('What is your GitHub username? ')
const token = await question('Do you have GitHub token in env? ', {
  choices: Object.keys(process.env),
})

let headers = {}
if (process.env[token]) {
  headers = {
    Authorization: `token ${process.env[token]}`,
  }
}
let res = await fetch(
  `https://api.github.com/users/${username}/repos?per_page=1000`,
  { headers }
)
const data = await res.json()
const urls = data.map((x) =>
  x.git_url.replace('git://github.com/', 'git@github.com:')
)

await $`mkdir -p backups`
cd('./backups')

for (const url of urls) {
  await $`git clone ${url}`
}
