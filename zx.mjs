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
import {promises as fs} from 'fs'
import {createRequire} from 'module'
import url from 'url'
import {$, fetch, ProcessOutput} from './index.mjs'

try {
  let firstArg = process.argv[2]

  if (['-v', '-V', '--version'].includes(firstArg)) {
    console.log(`zx version ${createRequire(import.meta.url)('./package.json').version}`)
    process.exit(0)
  }

  if (typeof firstArg === 'undefined' || firstArg[0] === '-') {
    let ok = await scriptFromStdin()
    if (!ok) {
      console.log(`usage: zx <script>`)
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
      filepath = join(process.cwd(), firstArg)
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

async function scriptFromStdin() {
  let script = ''
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      script += chunk
    }

    if (script.length > 0) {
      let filepath = join(
        tmpdir(),
        Math.random().toString(36).substr(2) + '.mjs'
      )
      await fs.mkdtemp(filepath)
      await writeAndImport(script, filepath, join(process.cwd(), 'stdin.mjs'))
      return true
    }
  }
  return false
}

async function scriptFromHttp(remote) {
  let res = await fetch(remote)
  if (!res.ok) {
    console.error(`Error: Can't get ${remote}`)
    process.exit(1)
  }
  let script = await res.text()
  let filepath = join(tmpdir(), basename(remote))
  await fs.mkdtemp(filepath)
  await writeAndImport(script, filepath, join(process.cwd(), basename(remote)))
}

async function writeAndImport(script, filepath, origin = filepath) {
  await fs.writeFile(filepath, script)
  let wait = importPath(filepath, origin)
  await fs.rm(filepath)
  await wait
}

async function importPath(filepath, origin = filepath) {
  let ext = extname(filepath)
  if (ext === '') {
    return await writeAndImport(
      await fs.readFile(filepath),
      join(dirname(filepath), basename(filepath) + '.mjs'),
      origin,
    )
  }
  if (ext === '.md') {
    return await writeAndImport(
      transformMarkdown((await fs.readFile(filepath)).toString()),
      join(dirname(filepath), basename(filepath) + '.mjs'),
      origin,
    )
  }
  if (ext === '.ts') {
    let {dir, name} = parse(filepath)
    let outFile = join(dir, name + '.mjs')
    await compile(filepath)
    await fs.rename(join(dir, name + '.js'), outFile)
    let wait = importPath(outFile, filepath)
    await fs.rm(outFile)
    return wait
  }
  let __filename = resolve(origin)
  let __dirname = dirname(__filename)
  let require = createRequire(origin)
  Object.assign(global, {__filename, __dirname, require})
  await import(url.pathToFileURL(filepath))
}

function transformMarkdown(source) {
  let output = []
  let state = 'root'
  let prevLineIsEmpty = true
  for (let line of source.split('\n')) {
    switch (state) {
      case 'root':
        if (/^( {4}|\t)/.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
        } else if (/^```(js)?$/.test(line)) {
          output.push('')
          state = 'code'
        } else {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
        }
        break
      case 'tab':
        if (/^( +|\t)/.test(line)) {
          output.push(line)
        } else if (line === '') {
          output.push('')
        } else {
          output.push('// ' + line)
          state = 'root'
        }
        break
      case 'code':
        if (/^```$/.test(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push(line)
        }
        break
    }
  }
  return output.join('\n')
}

async function compile(input) {
  let v = $.verbose
  $.verbose = false
  let tsc = $`npm_config_yes=true npx -p typescript tsc --target esnext --lib esnext --module esnext --moduleResolution node ${input}`
  $.verbose = v

  let i = 0, color = [chalk.magentaBright, chalk.cyanBright, chalk.yellowBright,
      chalk.greenBright, chalk.blueBright][new Date().getMinutes() % 5],
    interval = setInterval(() => {
      process.stdout.write('  '
        + color(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][i++ % 10])
        + '\r'
      )
    }, 100)

  await tsc

  clearInterval(interval)
  process.stdout.write('   \r')
}
