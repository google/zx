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

import { $ } from './core.js'
import { spinner } from './experimental.js'

export async function installDeps(
  dependencies: Record<string, string>,
  prefix?: string
) {
  const packages = Object.entries(dependencies).map(
    ([name, version]) => `${name}@${version}`
  )
  const flags = prefix ? `--prefix=${prefix}` : ''
  if (packages.length === 0) {
    return
  }
  await spinner(`npm i ${packages.join(' ')}`, () =>
    $`npm install --no-save --no-audit --no-fund ${flags} ${packages}`.nothrow()
  )
}

const builtins = new Set([
  '_http_agent',
  '_http_client',
  '_http_common',
  '_http_incoming',
  '_http_outgoing',
  '_http_server',
  '_stream_duplex',
  '_stream_passthrough',
  '_stream_readable',
  '_stream_transform',
  '_stream_wrap',
  '_stream_writable',
  '_tls_common',
  '_tls_wrap',
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
])
const importRe = [
  /\bimport\s+['"](?<path>[^'"]+)['"]/,
  /\bimport\(['"](?<path>[^'"]+)['"]\)/,
  /\brequire\(['"](?<path>[^'"]+)['"]\)/,
  /\bfrom\s+['"](?<path>[^'"]+)['"]/,
]
const nameRe =
  /^(?<name>(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)\/?.*$/i
const versionRe =
  /(\/\/|\/\*)\s*@(?<version>[~^]?(v?[\dx*]+([-.][\d*a-z-]+)*))/i

export function parseDeps(content: Buffer): Record<string, string> {
  const deps: Record<string, string> = {}
  const lines = content.toString().split('\n')
  for (let line of lines) {
    const tuple = parseImports(line)
    if (tuple) {
      deps[tuple.name] = tuple.version
    }
  }
  return deps
}

function parseImports(
  line: string
): { name: string; version: string } | undefined {
  for (let re of importRe) {
    const name = parsePackageName(re.exec(line)?.groups?.path)
    const version = parseVersion(line)
    if (name) {
      return { name, version }
    }
  }
}

function parsePackageName(path?: string): string | undefined {
  if (!path) return
  const name = nameRe.exec(path)?.groups?.name
  if (name && !builtins.has(name)) {
    return name
  }
}

function parseVersion(line: string) {
  return versionRe.exec(line)?.groups?.version || 'latest'
}
