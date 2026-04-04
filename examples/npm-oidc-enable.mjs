#!/usr/bin/env zx

// Copyright 2026 Google LLC
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

// Bulk setup npm OIDC trusted publishing.
// Requires npm >= 11.5.1.

const config = [
  {
    owner: 'semrel-extra',
    repo: 'zx-semrel',
    workflow: 'release.yml',
    packages: ['zx-semrel', '@semrel-extra/zx-semrel'],
  },
  // {
  //   owner: 'semrel-extra',
  //   repo: 'zx-bulk-release',
  //   workflow: 'release.yml',
  //   packages: ['zx-bulk-release', '@semrel-extra/zx-bulk-release'],
  // },
]

const dryRun = argv['dry-run']
const $$ = $({stdio: 'inherit'})

// Check npm version
const npmVersion = (await $`npm --version`).toString().trim()
const [major, minor] = npmVersion.split('.').map(Number)
if (major < 11 || (major === 11 && minor < 10)) {
  echo`npm >= 11.10.0 required, got ${npmVersion}`
  process.exit(1)
}

// Check auth
try {
  await $`npm whoami`
} catch {
  echo`Not logged in to npm.`
  await $$`npm login`
}
const user = (await $`npm whoami`).toString().trim()
echo`Logged in as: ${user}\n`

// Summary
const total = config.reduce((n, e) => n + e.packages.length, 0)
echo`${total} package(s) across ${config.length} repo(s)${dryRun ? ' (dry run)' : ''}:\n`
for (const {owner, repo, workflow, packages} of config) {
  echo`  ${owner}/${repo} (${workflow}): ${packages.join(', ')}`
}

if (!dryRun) {
  echo``
  echo`First package will prompt for TOTP.`
  echo`Enable 5-min skip window to avoid re-entering for the rest.`
  const ok = await question('\nProceed? [y/N] ')
  if (ok.toLowerCase() !== 'y') process.exit(0)
}
echo``

// Apply
let passed = 0, failed = 0

for (const {owner, repo, workflow, packages} of config) {
  const slug = `${owner}/${repo}`
  echo`${slug} (${workflow})`

  for (const pkg of packages) {
    const flags = ['--yes', `--file=${workflow}`, `--repo=${slug}`]
    try {
      if (dryRun) {
        echo`  [skip] npm trust github ${pkg} ${flags.join(' ')}`
      } else {
        await $$`npm trust github ${pkg} ${flags}`
        echo`  ✓ ${pkg}`
      }
      passed++
    } catch (e) {
      echo`  ✗ ${pkg}: ${e.stderr?.trim() || e.message}`
      failed++
    }
    if (!dryRun) await sleep(2000)
  }
  echo``
}

echo`Done: ${passed} ok, ${failed} failed`
if (failed) process.exit(1)
