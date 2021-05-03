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

let username = await question('What is your GitHub username? ')
let token = await question('Do you have GitHub token in env? ', {
  choices: Object.keys(process.env)
})

let headers = {}
if (process.env[token]) {
  headers = {
    Authorization: `token ${process.env[token]}`
  }
}
let res = await fetch(`https://api.github.com/users/${username}/repos`, {headers})
let data = await res.json()
let urls = data.map(x => x.git_url)

await $`mkdir -p backups`
cd('./backups')

await Promise.all(urls.map(url => $`git clone ${url}`))
