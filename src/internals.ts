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

import { createRequire } from 'node:module'
import { $ } from './core.js'

interface DepOptions {
  userconfig?: string
  registry?: string
  prefix?: string
}

export const resolve = createRequire(import.meta.url).resolve

export async function importDeps(
  dependencies: Record<string, any> = {},
  options: DepOptions = {}
) {
  const pkgs = Object.entries(dependencies)
    .map(([name, version]) => `${name}@${version}`)
    .filter(Boolean)

  const flags = Object.entries(options).map(
    ([name, value]) => `--${name}=${value}`
  )

  if (pkgs.length === 0) {
    return {}
  }

  await $`npm install --no-save --no-audit --no-fund ${flags} ${pkgs}`

  return (
    await Promise.all(
      Object.entries(dependencies).map(async ([name]) => ({
        module: await import(resolve(name)),
        name,
      }))
    )
  ).reduce<Record<string, any>>((acc, { name, module }) => {
    acc[name] = module
    return acc
  }, {})
}

export function parseDeps(content: string): Record<string, any> {
  const re =
    /(?:\sfrom\s+|[\s(:\[](?:import|require)\s*\()["']((?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)[/a-z0-9-._~]*["'](?:\s*;?\s*(?:\/\*|\/\/)\s*([a-z0-9-._~^*]+))?/g
  const builtinsRe =
    /^(_http_agent|_http_client|_http_common|_http_incoming|_http_outgoing|_http_server|_stream_duplex|_stream_passthrough|_stream_readable|_stream_transform|_stream_wrap|_stream_writable|_tls_common|_tls_wrap|assert|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|domain|events|fs|http|http2|https|inspector|module|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|trace_events|tty|url|util|v8|vm|wasi|worker_threads|zlib)$/
  const deps: Record<string, any> = {}
  let m

  do {
    m = re.exec(content)
    if (m && !builtinsRe.test(m[1])) {
      deps[m[1]] = m[2] || 'latest'
    }
  } while (m)

  return deps
}
