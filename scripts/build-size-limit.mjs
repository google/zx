#!/usr/bin/env node

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

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(new URL(import.meta.url).pathname, '../..')
const configPath = path.join(root, '.size-limit.json')
const original = fs.readFileSync(configPath, 'utf8')
const config = JSON.parse(original)

// size-limit --json returns only `{error}` when any check exceeds its limit,
// and omits JSON entirely if entries have no `limit` field, so we measure
// against a permissive copy with a huge limit and restore the original file.
const permissive = config.map((e) => ({ ...e, limit: '1 GB' }))
fs.writeFileSync(configPath, JSON.stringify(permissive, null, 2) + '\n', 'utf8')

const bin = path.join(root, 'node_modules/.bin/size-limit')
let measured
try {
  const res = spawnSync(bin, ['--json'], {
    encoding: 'utf8',
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (res.status !== 0) {
    console.error(res.stdout)
    if (res.stderr) console.error(res.stderr)
    process.exit(res.status || 1)
  }
  measured = JSON.parse(res.stdout)
} finally {
  fs.writeFileSync(configPath, original, 'utf8')
}

const byName = new Map(measured.map((m) => [m.name, m.size]))
let changed = 0
for (const entry of config) {
  const size = byName.get(entry.name)
  if (size == null) continue
  // Round up to 0.01 kB so the recorded limit is never below the measurement.
  const kb = (Math.ceil((size * 100) / 1000) / 100).toFixed(2)
  const next = `${kb} kB`
  if (entry.limit !== next) {
    console.log(`${entry.name}: ${entry.limit} → ${next}`)
    entry.limit = next
    changed++
  }
}

if (changed === 0) {
  console.log('No size-limit changes.')
  process.exit(0)
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
console.log(`Updated ${changed} entr${changed === 1 ? 'y' : 'ies'}.`)
