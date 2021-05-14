#!/usr/bin/env node

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

import {join, basename, resolve, dirname} from 'path'
import os, {tmpdir} from 'os'
import {promises as fs} from 'fs'
import {createRequire} from 'module'
import url from 'url'
import {v4 as uuid} from 'uuid'
import {$, cd, question, fetch, chalk, sleep, ProcessOutput} from './index.mjs'

Object.assign(global, {
  $,
  cd,
  fetch,
  question,
  chalk,
  sleep,
  fs,
  os
})

try {
  let firstArg = process.argv[2]

  if (['-v', '-V', '--version'].includes(firstArg)) {
    console.log(`zx version ${createRequire(import.meta.url)('./package.json').version}`)
    process.exit(0)
  }

  if (typeof firstArg === 'undefined') {
    let ok = await scriptFromStdin()
    if (!ok) {
      console.log(`usage: zx <script>`)
      process.exit(2)
    }
  } else if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
    await scriptFromHttp(firstArg)
  } else {
    let path
    if (firstArg.startsWith('/') || firstArg.startsWith('file:///')) {
      path = firstArg
    } else {
      path = join(process.cwd(), firstArg)
    }
    await importPath(path)
  }

} catch (p) {
  if (p instanceof ProcessOutput) {
    console.error('  at ' + p.__from)
    process.exit(1)
  } else {
    throw p
  }
}

async function scriptFromStdin() {
  let script = ''
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      script += chunk
    }

    if (script.length > 0) {
      let filepath = join(tmpdir(), uuid() + '.mjs')
      await writeAndImport(filepath, script)
      return true
    }
  }
  return false
}

async function scriptFromHttp(firstArg) {
  let res = await fetch(firstArg)
  if (!res.ok) {
    console.error(`Error: Can't get ${firstArg}`)
    process.exit(1)
  }
  let script = await res.text()
  let filepath = join(tmpdir(), basename(firstArg))
  await writeAndImport(filepath, script)
}

async function writeAndImport(filepath, script) {
  await fs.mkdtemp(filepath)
  try {
    await fs.writeFile(filepath, script)
    await import(url.pathToFileURL(filepath))
  } finally {
    await fs.rm(filepath)
  }
}

async function importPath(filepath) {
  let __filename = resolve(filepath)
  let __dirname = dirname(__filename)
  let require = createRequire(filepath)
  Object.assign(global, {__filename, __dirname, require})
  await import(url.pathToFileURL(filepath))
}
