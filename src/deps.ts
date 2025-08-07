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

import { builtinModules } from 'node:module'
import { $, spinner, Fail } from './index.ts'
import { depseek } from './vendor.ts'

/**
 * Install npm dependencies
 * @param dependencies object of dependencies
 * @param prefix  path to the directory where npm should install the dependencies
 * @param registry custom npm registry URL when installing dependencies
 * @param installerType package manager: npm, yarn, pnpm, bun, etc.
 */
export async function installDeps(
  dependencies: Record<string, string>,
  prefix?: string,
  registry?: string,
  installerType = 'npm'
): Promise<void> {
  const installer = installers[installerType]
  const packages = Object.entries(dependencies).map(
    ([name, version]) => `${name}@${version}`
  )
  if (packages.length === 0) return
  if (!installer) {
    throw new Fail(
      `Unsupported installer type: ${installerType}. Supported types: ${Object.keys(installers).join(', ')}`
    )
  }

  await spinner(`${installerType} i ${packages.join(' ')}`, () =>
    installer({ packages, prefix, registry })
  )
}

type DepsInstaller = (opts: {
  packages: string[]
  registry?: string
  prefix?: string
}) => Promise<void>

const installers: Record<any, DepsInstaller> = {
  npm: async ({ packages, prefix, registry }) => {
    const flags = [
      '--no-save',
      '--no-audit',
      '--no-fund',
      prefix && `--prefix=${prefix}`,
      registry && `--registry=${registry}`,
    ].filter(Boolean)
    await $`npm install ${flags} ${packages}`.nothrow()
  },
}

const builtins = new Set(builtinModules)

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
  if (name && !builtins.has(name)) return name
}

function parseVersion(line: string) {
  return versionRe.exec(line)?.groups?.version || 'latest'
}
