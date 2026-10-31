// Copyright 2026 Google LLC
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
import http from 'node:http'
import { $, fs, path, tmpdir } from 'zx'

const guest = async () => {
  console.log(`webcontainer: ${process.versions.webcontainer}`)
  const str = `it's a\\b`
  assert.notEqual((await $`echo foo`).text(), 'foo\n')
  assert.notEqual((await $`echo ${str}`).stdout, `${str}\n`)

  $.prefix = ''
  $.postfix = ' '
  $.quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, `'\\''`)}'`

  assert.equal((await $`echo foo`).text(), 'foo\n')
  assert.equal((await $`echo ${str}`).stdout, `${str}\n`)
  assert.deepEqual((await $`echo a; echo b`).lines(), ['a', 'b'])
  assert.equal((await $`true`).exitCode, 0)
  assert.equal((await $({ nothrow: true })`false`).exitCode, 1)
  assert.equal((await $({ nothrow: true })`exit 3`).exitCode, 3)
  assert.equal((await $({ cwd: '/tmp' })`pwd`).stdout, '/tmp\n')
  console.log('smoke webcontainer: ok')
}

const file = (p) => ({ file: { contents: fs.readFileSync(p, 'utf8') } })
const tree = (dir) =>
  Object.fromEntries(
    fs.readdirSync(dir, { withFileTypes: true }).map((e) => {
      const p = path.join(dir, e.name)
      return [e.name, e.isDirectory() ? { directory: tree(p) } : file(p)]
    })
  )

const API = 'https://cdn.jsdelivr.net/npm/@webcontainer/api@1.6.4/+esm'
const page = `<script type=module>
const report = (code, out) => fetch('/result', { method: 'POST', body: JSON.stringify({ code, out }) })
try {
  const { WebContainer } = await import('${API}')
  const wc = await WebContainer.boot()
  await wc.mount(await (await fetch('/tree')).json())
  const p = await wc.spawn('node', ['test.mjs'])
  let out = ''
  p.output.pipeTo(new WritableStream({ write(c) { out += c } }))
  report(await p.exit, out)
} catch (e) { report(1, String(e)) }
</script>`

const host = () => {
  let chrome
  const server = http.createServer((req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html')
      return res.end(page)
    }
    if (req.url === '/tree') {
      return res.end(
        JSON.stringify({
          'package.json': { file: { contents: '{"type":"module"}' } },
          'test.mjs': file(process.argv[1]),
          node_modules: {
            directory: {
              zx: {
                directory: {
                  'package.json': file('package.json'),
                  build: { directory: tree('build') },
                },
              },
            },
          },
        })
      )
    }
    if (req.url !== '/result') return res.end()
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      const { code, out } = JSON.parse(body)
      console.log(out)
      await chrome.nothrow().kill()
      process.exit(code)
    })
  })
  server.listen(0, async () => {
    const url = `http://localhost:${server.address().port}`
    const bin = process.env.CHROME || 'google-chrome'
    console.log(`browser: ${(await $`${bin} --version`).stdout.trim()}`)
    console.log(`webcontainer api: ${API}`)
    chrome = $({
      quiet: true,
    })`${bin} --headless=new --no-sandbox --user-data-dir=${tmpdir()} ${url}`
  })
}

await (process.versions.webcontainer ? guest() : host())
