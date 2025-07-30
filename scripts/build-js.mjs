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

import path from 'node:path'
import fs from 'node:fs'
import esbuild from 'esbuild'
import { injectCode, injectFile } from 'esbuild-plugin-utils'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { entryChunksPlugin } from 'esbuild-plugin-entry-chunks'
import { hybridExportPlugin } from 'esbuild-plugin-hybrid-export'
import { transformHookPlugin } from 'esbuild-plugin-transform-hook'
import { extractHelpersPlugin } from 'esbuild-plugin-extract-helpers'
import esbuildResolvePlugin from 'esbuild-plugin-resolve'
import minimist from 'minimist'
import glob from 'fast-glob'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

const argv = minimist(process.argv.slice(2), {
  default: {
    entry: './src/index.ts',
    external: 'node:*',
    bundle: 'src', // 'all' | 'none'
    license: 'none', // see digestLicenses below // 'eof',
    minify: false,
    sourcemap: false,
    format: 'cjs,esm',
    target: 'node12',
    cwd: process.cwd(),
  },
  boolean: ['minify', 'sourcemap', 'hybrid'],
  string: ['entry', 'external', 'bundle', 'license', 'format', 'map', 'cwd'],
})
const {
  entry,
  external,
  bundle,
  minify,
  sourcemap,
  license,
  format,
  hybrid,
  cwd: _cwd,
} = argv

const formats = format.split(',')
const cwd = [_cwd].flat().pop()
const entries = entry.split(/:\s?/)
const entryPoints =
  entry.includes('*') || entry.includes('{')
    ? await glob(entries, { absolute: false, onlyFiles: true, cwd, root: cwd })
    : entries.map((p) => path.relative(cwd, path.resolve(cwd, p)))
const _bundle = bundle && bundle !== 'none'
const _external = ['zx/globals', ...(_bundle ? external.split(',') : [])] // https://github.com/evanw/esbuild/issues/1466

const plugins = [
  esbuildResolvePlugin({
    yaml: path.resolve(__dirname, '../node_modules/yaml/browser'),
  }),
]

const thirdPartyModules = new Set()

if (_bundle && entryPoints.length > 1) {
  plugins.push(entryChunksPlugin())
}

if (bundle === 'src') {
  // https://github.com/evanw/esbuild/issues/619
  // https://github.com/pradel/esbuild-node-externals/pull/52
  plugins.push(nodeExternalsPlugin())
}

if (hybrid) {
  plugins.push(
    hybridExportPlugin({
      loader: 'reexport',
      to: 'build',
      toExt: '.js',
    })
  )
}

plugins.push(
  {
    name: 'get-3rd-party-modules',
    setup: (build) => {
      build.onResolve({ filter: /./, namespace: 'file' }, async (args) => {
        thirdPartyModules.add(args.resolveDir)
      })
    },
  },
  transformHookPlugin({
    hooks: [
      {
        on: 'end',
        if: !hybrid,
        pattern: /\.js$/,
        transform(contents, file) {
          const { name } = path.parse(file)
          const _contents = contents
            .toString()
            .replace(
              '} = __module__',
              `} = globalThis.Deno ? globalThis.require("./${name}.cjs") : __module__`
            )
          return injectCode(_contents, `import "./deno.js"`)
        },
      },
      {
        on: 'end',
        pattern: entryPointsToRegexp(entryPoints),
        transform(contents) {
          const extras = [
            // https://github.com/evanw/esbuild/issues/1633
            contents.includes('import_meta')
              ? './scripts/import-meta-url.polyfill.js'
              : '',

            //https://github.com/evanw/esbuild/issues/1921
            // p.includes('vendor') ? './scripts/require.polyfill.js' : '',
          ].filter(Boolean)
          return injectFile(contents, ...extras)
        },
      },
      {
        on: 'end',
        pattern: entryPointsToRegexp(entryPoints),
        transform(contents) {
          return contents
            .toString()
            .replaceAll('import.meta.url', 'import_meta_url')
            .replaceAll('import_meta.url', 'import_meta_url')
            .replaceAll('"node:', '"')
            .replaceAll(
              'require("stream/promises")',
              'require("stream").promises'
            )
            .replaceAll('require("fs/promises")', 'require("fs").promises')
            .replaceAll('}).prototype', '}).prototype || {}')
            .replace(/DISABLE_NODE_FETCH_NATIVE_WARN/, ($0) => `${$0} || true`)
            .replace(
              /\/\/ Annotate the CommonJS export names for ESM import in node:/,
              ($0) => `/* c8 ignore next 100 */\n${$0}`
            )
            .replace(
              'yield import("zx/globals")',
              'yield require("./globals.cjs")'
            )
            .replace('require("./internals.ts")', 'require("./internals.cjs")')
        },
      },
    ],
  }),
  extractHelpersPlugin({
    cwd: 'build',
    include: /\.cjs/,
  }),
  {
    name: 'deno',
    setup(build) {
      build.onEnd(() => {
        fs.copyFileSync('./scripts/deno.polyfill.js', './build/deno.js')
        fs.writeFileSync(
          './build/3rd-party-licenses',
          digestLicenses(thirdPartyModules)
        )
      })
    },
  }
)

// prettier-ignore
function digestLicenses(dirs) {
  const digest = [...[...dirs]
    .reduce((m, d) => {
      const chunks = d.split('/')
      const i = chunks.lastIndexOf('node_modules')
      const name = chunks[i + 1]
      const shift = i + 1 + (name.startsWith('@') ? 2 : 1)
      const root = chunks.slice(0, shift).join('/')
      m.add(root)
      return m
    }, new Set())]
    .map(d => {
      const extractName = (entry) => entry?.name ? `${entry.name} <${entry.email}>` : entry
      const pkg = path.join(d, 'package.json')
      const pkgJson = JSON.parse(fs.readFileSync(pkg, 'utf-8'))
      const author = extractName(pkgJson.author)
      const contributors = (pkgJson.contributors || pkgJson.maintainers || []).map(extractName).join(', ')
      const by = author || contributors || '<unknown>'
      const repository = pkgJson.repository?.url || pkgJson.repository || ''
      const license = pkgJson.license || '<unknown>'

      if (pkgJson.name === 'zx') return

      return `${pkgJson.name}@${pkgJson.version}
  ${by}
  ${repository}
  ${license}`
    })
    .filter(Boolean)
    .sort()
    .join('\n\n')

  return `THIRD PARTY LICENSES

${digest}
`
}

function entryPointsToRegexp(entryPoints) {
  return new RegExp(
    '(' +
      entryPoints.map((e) => escapeRegExp(path.parse(e).name)).join('|') +
      ')\\.cjs$'
  )
}

function escapeRegExp(str) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
}

const esmConfig = {
  absWorkingDir: cwd,
  entryPoints,
  outdir: './build',
  bundle: _bundle,
  external: _external,
  minify,
  sourcemap,
  sourcesContent: false,
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  outExtension: {
    '.js': '.mjs',
  },
  plugins,
  legalComments: license,
  tsconfig: './tsconfig.json',
}

const cjsConfig = {
  ...esmConfig,
  outdir: './build',
  target: 'es6',
  format: 'cjs',
  outExtension: {
    '.js': '.cjs',
  },
}

for (const format of formats) {
  const config = format === 'cjs' ? cjsConfig : esmConfig
  console.log('esbuild config:', config)

  await esbuild.build(config).catch(() => process.exit(1))
}

process.exit(0)
