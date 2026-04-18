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

import { spawnSync } from 'node:child_process'

// Acknowledged advisories (GHSA ids) that should not fail the audit.
// Each entry needs a reason so future readers can re-evaluate.
const ALLOWED = [
  {
    id: 'GHSA-4w7w-66w2-5vf9',
    reason:
      'vite path traversal via `.map`. Reachable only through vitepress (devDep, docs build). No upstream fix available yet.',
  },
]

const allowed = new Map(ALLOWED.map((a) => [a.id, a]))

const { stdout, stderr, status } = spawnSync(
  'npm',
  ['audit', '--package-lock', '--json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
)

let report
try {
  report = JSON.parse(stdout)
} catch (e) {
  console.error('Failed to parse npm auditt output:', e.message)
  if (stderr) console.error(stderr)
  process.exit(status || 1)
}

if (report.error) {
  console.error(report.error.summary || report.error)
  process.exit(status || 1)
}

const findings = new Map()
for (const pkg of Object.values(report.vulnerabilities || {})) {
  for (const via of pkg.via || []) {
    if (typeof via !== 'object') continue
    const id = via.url ? via.url.split('/').pop() : String(via.source)
    if (findings.has(id)) continue
    findings.set(id, {
      id,
      package: pkg.name,
      severity: via.severity,
      title: via.title,
      url: via.url,
    })
  }
}

const chainCache = new Map()

function resolveChains(pkgName) {
  if (chainCache.has(pkgName)) return chainCache.get(pkgName)
  const { stdout } = spawnSync(
    'npm',
    ['ls', pkgName, '--all', '--json', '--package-lock-only'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  let tree
  try {
    tree = JSON.parse(stdout)
  } catch {
    tree = null
  }
  const result = { root: null, chains: [] }
  if (tree && tree.name) {
    result.root = { name: tree.name, version: tree.version }
    const walk = (node, path) => {
      for (const [name, child] of Object.entries(node.dependencies || {})) {
        const next = [...path, { name, version: child.version }]
        if (name === pkgName) result.chains.push(next)
        walk(child, next)
      }
    }
    walk(tree, [])
  }
  chainCache.set(pkgName, result)
  return result
}

function formatChains(pkgName) {
  const { root, chains } = resolveChains(pkgName)
  if (!root) return '      (could not resolve dependency chain)'
  if (chains.length === 0)
    return `      (no path found from ${root.name}@${root.version})`
  return chains
    .map((chain) => {
      const parts = [
        `${root.name}@${root.version}`,
        ...chain.map((s) => `${s.name}@${s.version}`),
      ]
      return `      ${parts.join(' → ')}`
    })
    .join('\n')
}

function fmt(f, extra) {
  const lines = [
    `  - ${f.id} (${f.severity}) in ${f.package}: ${f.title}`,
    `    url:   ${f.url}`,
  ]
  if (extra?.reason) lines.push(`    why:   ${extra.reason}`)
  lines.push('    chain:')
  lines.push(formatChains(f.package))
  return lines.join('\n')
}

const ignored = []
const remaining = []
for (const f of findings.values()) {
  if (allowed.has(f.id)) ignored.push(f)
  else remaining.push(f)
}

if (ignored.length > 0) {
  console.log(
    `Ignored ${ignored.length} acknowledged advisor${ignored.length === 1 ? 'y' : 'ies'}:`
  )
  for (const f of ignored) console.log(fmt(f, allowed.get(f.id)))
}

if (remaining.length > 0) {
  console.error(
    `\nUnresolved ${remaining.length} advisor${remaining.length === 1 ? 'y' : 'ies'}:`
  )
  for (const f of remaining) console.error(fmt(f))
  process.exit(1)
}

if (ignored.length === 0) console.log('npm audit: no vulnerabilities found.')
