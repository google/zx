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
import { spinner } from './goods.js'
import { depseek } from './vendor.js'

/**
 * Install npm dependencies
 * @param dependencies object of dependencies
 * @param prefix  path to the directory where npm should install the dependencies
 * @param registry custom npm registry URL when installing dependencies
 */
export async function installDeps(
  dependencies: Record<string, string>,
  prefix?: string,
  registry?: string
): Promise<void> {
  const prefixFlag = prefix ? `--prefix=${prefix}` : ''
  const registryFlag = registry ? `--registry=${registry}` : ''
  const packages = Object.entries(dependencies).map(
    ([name, version]) => `${name}@${version}`
  )
  if (packages.length === 0) {
    return
  }
  await spinner(`npm i ${packages.join(' ')}`, () =>
    $`npm install --no-save --no-audit --no-fund ${registryFlag} ${prefixFlag} ${packages}`.nothrow()
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
  'diagnostics_channel',
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

const nameRe = /^(?<name>(@[a-z\d-~][\w-.~]*\/)?[a-z\d-~][\w-.~]*)\/?.*$/i
const versionRe = /^@(?<version>[~^]?(v?[\dx*]+([-.][\d*a-z-]+)*))/i

export function parseDeps(content: string): Record<string, string> {
  return depseek(content + '\n', { comments: true }).reduce<
    Record<string, string>
  >((m, { type, value }, i, list) => {
    if (type === 'dep') {
      const meta = list[i + 1]
      const name = parsePackageName(value)
      const version =
        (meta?.type === 'comment' && parseVersion(meta?.value.trim())) ||
        'latest'
      if (name) m[name] = version
    }
    return m
  }, {})
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
