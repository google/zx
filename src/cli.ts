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

import fs from 'fs-extra'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import url from 'node:url'
import { updateArgv } from './goods.js'
import { $, argv, chalk, fetch, ProcessOutput } from './index.js'
import { startRepl } from './repl.js'
import { randomId } from './util.js'
import { installDeps, parseDeps } from './deps.js'

await (async function main() {
  const globals = './globals.js'
  await import(globals)
  if (argv.quiet) {
    $.verbose = false
  }
  if (typeof argv.shell === 'string') {
    $.shell = argv.shell
  }
  if (typeof argv.prefix === 'string') {
    $.prefix = argv.prefix
  }
  if (argv.experimental) {
    Object.assign(global, await import('./experimental.js'))
  }
  if (process.argv.length == 3) {
    if (['--version', '-v', '-V'].includes(process.argv[2])) {
      console.log(getVersion())
      return
    }
    if (['--help', '-h'].includes(process.argv[2])) {
      printUsage()
      return
    }
    if (['--interactive', '-i'].includes(process.argv[2])) {
      startRepl()
      return
    }
  }
  if (argv.eval || argv.e) {
    const script = (argv.eval || argv.e).toString()
    await runScript(script)
    return
  }
  let firstArg = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (typeof firstArg === 'undefined' || firstArg === '-') {
    let ok = await scriptFromStdin()
    if (!ok) {
      startRepl()
    }
  } else if (
    firstArg.startsWith('http://') ||
    firstArg.startsWith('https://')
  ) {
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
    updateArgv({ sliceAt: 3 })
    await importPath(filepath)
  }
  return
})().catch((err) => {
  if (err instanceof ProcessOutput) {
    console.error('Error:', err.message)
  } else {
    console.error(err)
  }
  process.exitCode = 1
})

async function runScript(script: string) {
  let filepath = join(tmpdir(), randomId() + '.mjs')
  await fs.mkdtemp(filepath)
  await writeAndImport(script, filepath, join(process.cwd(), 'stdin.mjs'))
}

async function scriptFromStdin() {
  let script = ''
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      script += chunk
    }

    if (script.length > 0) {
      await runScript(script)
      return true
    }
  }
  return false
}

async function scriptFromHttp(remote: string) {
  let res = await fetch(remote)
  if (!res.ok) {
    console.error(`Error: Can't get ${remote}`)
    process.exit(1)
  }
  let script = await res.text()
  let filename = new URL(remote).pathname
  let filepath = join(tmpdir(), basename(filename))
  await fs.mkdtemp(filepath)
  await writeAndImport(
    script,
    filepath,
    join(process.cwd(), basename(filename))
  )
}

async function writeAndImport(
  script: string | Buffer,
  filepath: string,
  origin = filepath
) {
  const contents = script.toString()
  await fs.writeFile(filepath, contents)

  if (argv.install) {
    await installDeps(parseDeps(contents), {
      prefix: dirname(filepath),
      registry: argv.registry,
      userconfig: argv.userconfig,
    })
  }

  let wait = importPath(filepath, origin)
  await fs.rm(filepath)
  await wait
}

async function importPath(filepath: string, origin = filepath) {
  let ext = extname(filepath)

  if (ext === '') {
    let tmpFilename = fs.existsSync(`${filepath}.mjs`)
      ? `${basename(filepath)}-${randomId()}.mjs`
      : `${basename(filepath)}.mjs`

    return await writeAndImport(
      await fs.readFile(filepath),
      join(dirname(filepath), tmpFilename),
      origin
    )
  }
  if (ext === '.md') {
    return await writeAndImport(
      transformMarkdown(await fs.readFile(filepath)),
      join(dirname(filepath), basename(filepath) + '.mjs'),
      origin
    )
  }
  let __filename = resolve(origin)
  let __dirname = dirname(__filename)
  let require = createRequire(origin)
  Object.assign(global, { __filename, __dirname, require })
  await import(url.pathToFileURL(filepath).toString())
}

function transformMarkdown(buf: Buffer) {
  let source = buf.toString()
  let output = []
  let state = 'root'
  let prevLineIsEmpty = true
  for (let line of source.split('\n')) {
    switch (state) {
      case 'root':
        if (/^( {4}|\t)/.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
        } else if (/^```(js|javascript)$/.test(line)) {
          output.push('')
          state = 'js'
        } else if (/^```(sh|bash)$/.test(line)) {
          output.push('await $`')
          state = 'bash'
        } else if (/^```.*$/.test(line)) {
          output.push('')
          state = 'other'
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
      case 'js':
        if (/^```$/.test(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'bash':
        if (/^```$/.test(line)) {
          output.push('`')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'other':
        if (/^```$/.test(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push('// ' + line)
        }
        break
    }
  }
  return output.join('\n')
}

function getVersion(): string {
  return createRequire(import.meta.url)('../package.json').version
}

function printUsage() {
  console.log(`
 ${chalk.bold('zx ' + getVersion())}
   A tool for writing better scripts

 ${chalk.bold('Usage')}
   zx [options] <script>

 ${chalk.bold('Options')}
   --quiet                  don't echo commands
   --shell=<path>           custom shell binary
   --prefix=<command>       prefix all commands
   --interactive, -i        start repl
   --eval=<js>, -e          evaluate script 
   --experimental           enable new api proposals
   --install                parse and load script dependencies from the registry
   --registry=<url>         registry url to use for install
   --userconfig=<path>      .npmrc config path to use for install
   --version, -v            print current zx version
   --help, -h               print help
`)
}
