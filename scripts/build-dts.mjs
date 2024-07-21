#!/usr/bin/env node

// Copyright 2024 Google LLC
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

import fs from 'fs/promises'
import { generateDtsBundle } from 'dts-bundle-generator'
import glob from 'fast-glob'

const output = {
  inlineDeclareExternals: true,
  inlineDeclareGlobals: true,
  sortNodes: false,
  exportReferencedTypes: false, //args['export-referenced-types'],
}
const entries = [
  {
    filePath: './src/vendor-extra.ts',
    outFile: './build/vendor-extra.d.ts',
    libraries: {
      allowedTypesLibraries: ['node'], // args['external-types'],
      inlinedLibraries: [
        '@nodelib/fs.stat',
        '@nodelib/fs.scandir',
        '@nodelib/fs.walk',
        'fast-glob',
        '@types/jsonfile',
        'node-fetch-native',
        // 'chalk',
        'globby',
        '@types/minimist',
        // '@types/which',
        // 'zurk',
        // '@webpod/ps',
        '@webpod/ingrid',
        'depseek',
      ], // args['external-inlines'],
    },
    output,
  },
  {
    filePath: './src/vendor-core.ts',
    outFile: './build/vendor-core.d.ts',
    libraries: {
      allowedTypesLibraries: ['node'], // args['external-types'],
      inlinedLibraries: [
        '@types/which',
        '@webpod/ps',
        '@webpod/ingrid',
        'chalk',
        'zurk',
      ], // args['external-inlines'],
    },
    output,
  },
]

const compilationOptions = {
  preferredConfigPath: './tsconfig.prod.json', // args.project,
  followSymlinks: true,
}

const results = generateDtsBundle(entries, compilationOptions)
  // generateDtsBundle cannot handle the circular refs on types inlining, so we need to help it manually:
  /*
build/vendor.d.ts(163,7): error TS2456: Type alias 'Options' circularly references itself.
build/vendor.d.ts(164,7): error TS2456: Type alias 'Entry' circularly references itself.
build/vendor.d.ts(165,7): error TS2456: Type alias 'Task' circularly references itself.
build/vendor.d.ts(166,7): error TS2456: Type alias 'Pattern' circularly references itself.
build/vendor.d.ts(167,7): error TS2456: Type alias 'FileSystemAdapter' circularly references itself.
build/vendor.d.ts(197,48): error TS2694: Namespace 'FastGlob' has no exported member 'FastGlobOptions
 */

  .map((r) =>
    r
      .replace('type Options = Options;', 'export {Options};')
      .replace('type Task = Task;', 'export {Task};')
      .replace('type Pattern = Pattern;', 'export {Pattern};')
      .replace('FastGlob.FastGlobOptions', 'FastGlob.Options')
      .replace('type Entry =', 'export type Entry =')
  )

for (const i in results) {
  const entry = entries[i]
  const result = results[i]

  await fs.writeFile(entry.outFile, result, 'utf8')
}

// Replaces redundant triple-slash directives
for (const dts of await glob(['build/**/*.d.ts', '!build/vendor-*.d.ts'])) {
  const contents = (await fs.readFile(dts, 'utf8'))
    .split('\n')
    .filter((line) => !line.startsWith('/// <reference types'))
    .join('\n')

  await fs.writeFile(dts, contents, 'utf8')
}

process.exit(0)
