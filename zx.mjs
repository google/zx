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

import {basename, dirname, extname, join, parse, resolve} from 'path'
import {tmpdir} from 'os'
import fs from 'fs-extra'
import {createRequire} from 'module'
import url from 'url'
import {$, ProcessOutput, argv} from './index.mjs'
import { scriptFromStdin, scriptFromHttp, writeAndImport, importPath, transformMarkdown, compile} from './import.mjs';

import './globals.mjs'

try {
  if (argv.version || argv.v || argv.V) {
    console.log(`zx version ${createRequire(import.meta.url)('./package.json').version}`)
    process.exit(0)
  }
  let firstArg = process.argv.slice(2).find(a => !a.startsWith('--'))
  if (typeof firstArg === 'undefined' || firstArg === '-') {
    let ok = await scriptFromStdin()
    if (!ok) {
      printUsage()
      process.exit(2)
    }
  } else if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
    await scriptFromHttp(firstArg)
  } else {
    let filepath
    if (firstArg.startsWith('/')) {
      filepath = firstArg
    } else if (firstArg.startsWith('file:///')) {
      filepath = url.fileURLToPath(firstArg)
    } else {
      filepath = resolve(firstArg)
    }
    await importPath(filepath)
  }

} catch (p) {
  if (p instanceof ProcessOutput) {
    console.error('Error: ' + p.message)
    process.exit(1)
  } else {
    throw p
  }
}

function printUsage() {
  console.log(`
 ${chalk.bgGreenBright.black(' ZX ')}

 Usage:
   zx [options] <script>
 
 Options:
   --quiet            : don't echo commands
   --shell=<path>     : custom shell binary
   --prefix=<command> : prefix all commands
`)
}
