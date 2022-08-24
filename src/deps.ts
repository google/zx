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
import { safe } from './util.js'

interface DepOptions {
  userconfig?: string
  registry?: string
  prefix?: string
}

export const resolve = createRequire(import.meta.url).resolve

export async function deps(
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

  const args = [
    'npm',
    'install',
    '--no-save',
    '--no-audit',
    '--no-fund',
    ...flags,
    ...pkgs,
  ]
  const pieces = new Array(args.length + 1).fill(' ')

  await $(pieces as any as TemplateStringsArray, ...args)

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
