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

// https://github.com/nodejs/node/blob/5fad0b93667ffc6e4def52996b9529ac99b26319/test/parallel/test-internal-module-require.js
// + wasi https://nodejs.org/api/wasi.html
// + fs/promises https://nodejs.org/api/fs.html#promises-api
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
  'fs/promises',
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

export function parseDeps(content: Buffer): Record<string, string> {
  const re =
    /(?:\sfrom\s+|(?:[\b\s(\[{:;=+\-*|/]|\.{3}|^)(?:import|require)\s*\()["']((?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)[/a-z0-9-._~]*["'](?:\)?[\s;,]*(?:\/\*|\/\/)\s*([a-z0-9-._~^*]+))?/g
  const deps: Record<string, string> = {}

  let m
  do {
    m = re.exec(content.toString())
    if (m && !builtins.has(m[1])) {
      deps[m[1]] = m[2] || 'latest'
    }
  } while (m)
  return deps
}
