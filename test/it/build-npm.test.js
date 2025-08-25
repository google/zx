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

import assert from 'node:assert'
import { describe, test } from 'node:test'
import {
  $,
  within,
  path,
  glob,
  tempdir,
  fs,
  version,
} from '../../build/index.js'

const __dirname = new URL('.', import.meta.url).pathname
const root = path.resolve(__dirname, '../..')
const sync = async (from, to, entries) => {
  for (const entry of entries)
    await fs.copy(path.resolve(from, entry), path.join(to, entry))
}

describe('npm artifact', () => {
  describe('contents', () => {
    test('zx full', async () =>
      within(async () => {
        const tmp = tempdir()
        $.cwd = tmp
        $.quiet = true

        // link
        await $`ln -s ${path.resolve(root, 'node_modules')} ${path.resolve(tmp, 'node_modules')}`
        await sync(root, tmp, [
          'scripts',
          'build',
          'man',
          'package.json',
          'package-main.json',
          'README.md',
          'LICENSE',
        ])

        // pack / unpack
        await $`mv package-main.json package.json`
        const pack = await $`npm pack`
        await $`tar xf ${pack}`
        await $`rm ${pack}`.nothrow()

        // run
        const { stderr } =
          await $`node -e 'import {$} from "./package/build/core.js"; $.verbose = true; await $\`echo hello\`'`
        assert.match(stderr, /hello/)

        // contents
        const pkgJson = await fs.readJson(
          path.resolve(tmp, 'package/package.json')
        )
        const files = await glob('**/*', {
          cwd: path.resolve(tmp, 'package'),
          absolute: false,
          onlyFiles: true,
        })

        assert.equal(pkgJson.name, 'zx')
        assert.equal(pkgJson.description, 'A tool for writing better scripts')
        assert.equal(pkgJson.devDependencies, undefined)
        assert.equal(pkgJson.prettier, undefined)
        assert.equal(pkgJson.scripts, undefined)
        assert.equal(pkgJson.volta, undefined)

        assert.deepEqual(
          files.sort(),
          [
            'LICENSE',
            'README.md',
            'package.json',
            'man/zx.1',
            'build/cli.cjs',
            'build/cli.d.ts',
            'build/cli.js',
            'build/core.cjs',
            'build/core.d.ts',
            'build/core.js',
            'build/deno.js',
            'build/deps.cjs',
            'build/deps.d.ts',
            'build/error.d.ts',
            'build/esblib.cjs',
            'build/globals.cjs',
            'build/globals.d.ts',
            'build/globals.js',
            'build/goods.d.ts',
            'build/index.cjs',
            'build/index.d.ts',
            'build/index.js',
            'build/internals.cjs',
            'build/internals.d.ts',
            'build/log.d.ts',
            'build/md.d.ts',
            'build/util.cjs',
            'build/util.d.ts',
            'build/versions.d.ts',
            'build/vendor-core.cjs',
            'build/vendor-core.d.ts',
            'build/vendor-extra.cjs',
            'build/vendor-extra.d.ts',
            'build/vendor.cjs',
            'build/vendor.d.ts',
            'build/3rd-party-licenses',
          ].sort()
        )
      }))

    test('zx@lite', async () =>
      within(async () => {
        const tmp = tempdir()
        $.cwd = tmp
        $.quiet = true

        // link
        await $`ln -s ${path.resolve(root, 'node_modules')} ${path.resolve(tmp, 'node_modules')}`
        await sync(root, tmp, [
          'build',
          'package.json',
          'package-lite.json',
          'README.md',
          'LICENSE',
          'scripts',
        ])

        // pack / unpack
        await $`mv package-lite.json package.json`
        const pack = await $`npm pack`
        await $`tar xf ${pack}`
        await $`rm ${pack}`.nothrow()

        // run
        const { stderr } =
          await $`node -e 'import {$} from "./package/build/core.js"; $.verbose = true; await $\`echo hello\`'`
        assert.match(stderr, /hello/)

        // contents
        const pkgJson = await fs.readJson(
          path.resolve(tmp, 'package/package.json')
        )
        const files = await glob('**/*', {
          cwd: path.resolve(tmp, 'package'),
          absolute: false,
          onlyFiles: true,
        })

        assert.equal(pkgJson.name, 'zx')
        assert.equal(pkgJson.devDependencies, undefined)
        assert.equal(pkgJson.bin, undefined)
        assert.deepEqual(
          files.sort(),
          [
            'LICENSE',
            'README.md',
            'build/3rd-party-licenses',
            'build/core.cjs',
            'build/core.d.ts',
            'build/core.js',
            'build/deno.js',
            'build/error.d.ts',
            'build/esblib.cjs',
            'build/internals.cjs',
            'build/internals.d.ts',
            'build/log.d.ts',
            'build/util.cjs',
            'build/util.d.ts',
            'build/vendor-core.cjs',
            'build/vendor-core.d.ts',
            'package.json',
          ].sort()
        )
      }))
  })

  describe('compatibility', () => {
    test('js', async () => {
      const out = await within(async () => {
        $.cwd = path.resolve(root, 'test/fixtures/js-project')
        await $`npm i --no-package-lock`
        return $`node node_modules/zx/build/cli.js --verbose script.js`
      })
      assert.match(out.stderr, /js-script/)
    })

    test('tsc', async () => {
      const out = await within(async () => {
        $.cwd = path.resolve(root, 'test/fixtures/ts-project')
        await $`npm i --no-package-lock`
        try {
          await $`npx tsc`
        } catch (err) {
          throw new Error(err.stdout)
        }
        return $`node build/script.js`
      })
      assert.match(out.stderr, /ts-script/)
    })

    test('tsc (isolated)', async () => {
      const tmp = tempdir()
      const t$ = $({ cwd: tmp, quiet: true })
      const zxdir = path.resolve(tmp, 'node_modules/zx')
      const pkgJson = {
        name: 'zx-test',
        dependencies: {
          typescript: '^5',
          '@types/node': '*',
          '@types/fs-extra': '*',
        },
      }

      await fs.outputJSON(path.resolve(tmp, 'package.json'), pkgJson)
      await t$`npm i`
      await sync(root, zxdir, ['package.json', 'build']) // `file:<path>` dep mounts `node_modules` too, so we use cloning here

      const tsconfig = {
        compilerOptions: {
          module: 'commonjs',
          target: 'esnext',
          outDir: 'bundle',
          rootDir: 'src',
          declaration: true,
          declarationMap: false,
          esModuleInterop: true,
        },
        include: ['src'],
      }
      const indexTs = `import {$} from 'zx'
(async () => {
  await $({verbose: true})\`echo hello\`
})()
`
      await fs.outputJSON(path.resolve(tmp, 'tsconfig.json'), tsconfig)
      await fs.outputFile(path.resolve(tmp, 'src/index.ts'), indexTs)

      await t$`tsc`
      const out = await t$`node bundle/index.js`.text()
      assert.strictEqual(out, '$ echo hello\nhello\n')
    })

    test('esbuild (iife)', async () => {
      const tmp = tempdir()
      const t$ = $({ cwd: tmp, quiet: true })
      const zxdir = path.resolve(tmp, 'node_modules/zx')
      const pkgJson = {
        name: 'zx-test',
        dependencies: {
          esbuild: '^0.25.8',
        },
      }

      await sync(root, zxdir, ['package.json', 'build'])
      await fs.outputJSON(path.resolve(tmp, 'package.json'), pkgJson)

      const verJs = `import {version, $} from 'zx'
(async () => {
  await $({verbose: true})\`echo \${version}\`
})()
`
      await fs.outputFile(path.resolve(tmp, 'src/ver.js'), verJs)
      await fs.mkdir(path.resolve(tmp, 'bundle'))

      await t$`npx esbuild src/ver.js --bundle --format=iife --platform=node > bundle/ver.js`
      const out = await t$`node bundle/ver.js`.text()
      assert.strictEqual(out, `$ echo ${version}\n${version}\n`)
    })
  })
})
