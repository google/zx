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
  await $`npm install --no-save --no-audit --no-fund ${flags} ${packages}`
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
const nameRe = /^(?<name>(@[a-z0-9-]+\/)?[a-z0-9-]+)\/?.*$/i
const versionRe = /(\/\/|\/\*)\s*@(?<version>[~^]?([\dvx*]+([-.][\dx*]+)*))/i

export function parseDeps(content: Buffer): Record<string, string> {
  const deps: Record<string, string> = {}
  const lines = content.toString().split('\n')
  for (let line of lines) {
    for (let re of importRe) {
      const m1 = re.exec(line)
      if (m1 && m1.groups) {
        const m2 = nameRe.exec(m1.groups.path)
        if (m2 && m2.groups) {
          const name = m2.groups.name
          if (!builtins.has(name)) {
            let version = 'latest'
            const m3 = versionRe.exec(line)
            if (m3 && m3.groups) {
              version = m3.groups.version
            }
            deps[name] = version
          }
        }
      }
    }
  }
  return deps
}
