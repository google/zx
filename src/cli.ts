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

import url from 'node:url'
import {
  $,
  ProcessOutput,
  parseArgv,
  updateArgv,
  resolveDefaults,
  chalk,
  dotenv,
  fetch,
  fs,
  path,
  VERSION,
} from './index.js'
import { installDeps, parseDeps } from './deps.js'
import { randomId } from './util.js'
import { createRequire } from './vendor.js'

const EXT = '.mjs'

isMain() &&
  main().catch((err) => {
    if (err instanceof ProcessOutput) {
      console.error('Error:', err.message)
    } else {
      console.error(err)
    }
    process.exitCode = 1
  })

export function printUsage() {
  // language=txt
  console.log(`
 ${chalk.bold('zx ' + VERSION)}
   A tool for writing better scripts

 ${chalk.bold('Usage')}
   zx [options] <script>

 ${chalk.bold('Options')}
   --quiet              suppress any outputs
   --verbose            enable verbose mode
   --shell=<path>       custom shell binary
   --prefix=<command>   prefix all commands
   --postfix=<command>  postfix all commands
   --prefer-local, -l   prefer locally installed packages bins
   --cwd=<path>         set current directory
   --eval=<js>, -e      evaluate script
   --ext=<.mjs>         default extension
   --install, -i        install dependencies
   --registry=<URL>     npm registry, defaults to https://registry.npmjs.org/
   --version, -v        print current zx version
   --help, -h           print help
   --repl               start repl
   --env=<path>         path to env file
   --experimental       enables experimental features (deprecated)

 ${chalk.italic('Full documentation:')} ${chalk.underline('https://google.github.io/zx/')}
`)
}

// prettier-ignore
export const argv = parseArgv(process.argv.slice(2), {
  string: ['shell', 'prefix', 'postfix', 'eval', 'cwd', 'ext', 'registry', 'env'],
  boolean: ['version', 'help', 'quiet', 'verbose', 'install', 'repl', 'experimental', 'prefer-local'],
  alias: { e: 'eval', i: 'install', v: 'version', h: 'help', l: 'prefer-local', 'env-file': 'env' },
  stopEarly: true,
  parseBoolean: true,
  camelCase: true,
})

export async function main() {
  await import('./globals.js')
  argv.ext = normalizeExt(argv.ext)
  if (argv.cwd) $.cwd = argv.cwd
  if (argv.env) {
    const envfile = path.resolve($.cwd ?? process.cwd(), argv.env)
    dotenv.config(envfile)
    resolveDefaults()
  }
  if (argv.verbose) $.verbose = true
  if (argv.quiet) $.quiet = true
  if (argv.shell) $.shell = argv.shell
  if (argv.prefix) $.prefix = argv.prefix
  if (argv.postfix) $.postfix = argv.postfix
  if (argv.preferLocal) $.preferLocal = argv.preferLocal
  if (argv.version) {
    console.log(VERSION)
    return
  }
  if (argv.help) {
    printUsage()
    return
  }
  if (argv.repl) {
    await (await import('./repl.js')).startRepl()
    return
  }
  if (argv.eval) {
    await runScript(argv.eval, argv.ext)
    return
  }
  const [firstArg] = argv._
  updateArgv(argv._.slice(firstArg === undefined ? 0 : 1))
  if (!firstArg || firstArg === '-') {
    const success = await scriptFromStdin(argv.ext)
    if (!success) {
      printUsage()
      process.exitCode = 1
    }
    return
  }
  if (/^https?:/.test(firstArg)) {
    await scriptFromHttp(firstArg, argv.ext)
    return
  }
  const filepath = firstArg.startsWith('file:///')
    ? url.fileURLToPath(firstArg)
    : path.resolve(firstArg)
  await importPath(filepath)
}

export async function runScript(script: string, ext?: string) {
  const filepath = getFilepath($.cwd, 'zx', ext)
  await writeAndImport(script, filepath)
}

export async function scriptFromStdin(ext?: string): Promise<boolean> {
  let script = ''
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      script += chunk
    }

    if (script.length > 0) {
      await runScript(script, ext)
      return true
    }
  }
  return false
}

export async function scriptFromHttp(remote: string, _ext?: string) {
  const res = await fetch(remote)
  if (!res.ok) {
    console.error(`Error: Can't get ${remote}`)
    process.exit(1)
  }
  const script = await res.text()
  const pathname = new URL(remote).pathname
  const { name, ext } = path.parse(pathname)
  const filepath = getFilepath($.cwd, name, _ext || ext)
  await writeAndImport(script, filepath)
}

export async function writeAndImport(
  script: string | Buffer,
  filepath: string,
  origin = filepath
) {
  await fs.writeFile(filepath, script)
  try {
    process.once('exit', () => fs.rmSync(filepath, { force: true }))
    await importPath(filepath, origin)
  } finally {
    await fs.rm(filepath)
  }
}

export async function importPath(
  filepath: string,
  origin = filepath
): Promise<void> {
  const contents = await fs.readFile(filepath)
  const { ext, base, dir } = path.parse(filepath)
  const tempFilename = getFilepath(dir, base)

  if (ext === '') {
    return writeAndImport(contents, tempFilename, origin)
  }
  if (ext === '.md') {
    return writeAndImport(transformMarkdown(contents), tempFilename, origin)
  }
  if (argv.install) {
    const deps = parseDeps(contents)
    await installDeps(deps, dir, argv.registry)
  }

  injectGlobalRequire(origin)
  // TODO: fix unanalyzable-dynamic-import to work correctly with jsr.io
  await import(url.pathToFileURL(filepath).toString())
}

export function injectGlobalRequire(origin: string) {
  const __filename = path.resolve(origin)
  const __dirname = path.dirname(__filename)
  const require = createRequire(origin)
  Object.assign(globalThis, { __filename, __dirname, require })
}

export function transformMarkdown(buf: Buffer | string): string {
  const source = buf.toString()
  const output = []
  let state = 'root'
  let codeBlockEnd = ''
  let prevLineIsEmpty = true
  const jsCodeBlock = /^(```{1,20}|~~~{1,20})(js|javascript|ts|typescript)$/
  const shCodeBlock = /^(```{1,20}|~~~{1,20})(sh|shell|bash)$/
  const otherCodeBlock = /^(```{1,20}|~~~{1,20})(.*)$/
  for (const line of source.split(/\r?\n/)) {
    switch (state) {
      case 'root':
        if (/^( {4}|\t)/.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
        } else if (jsCodeBlock.test(line)) {
          output.push('')
          state = 'js'
          codeBlockEnd = line.match(jsCodeBlock)![1]
        } else if (shCodeBlock.test(line)) {
          output.push('await $`')
          state = 'bash'
          codeBlockEnd = line.match(shCodeBlock)![1]
        } else if (otherCodeBlock.test(line)) {
          output.push('')
          state = 'other'
          codeBlockEnd = line.match(otherCodeBlock)![1]
        } else {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
        }
        break
      case 'tab':
        if (line === '') {
          output.push('')
        } else if (/^( +|\t)/.test(line)) {
          output.push(line)
        } else {
          output.push('// ' + line)
          state = 'root'
        }
        break
      case 'js':
        if (line === codeBlockEnd) {
          output.push('')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'bash':
        if (line === codeBlockEnd) {
          output.push('`')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'other':
        if (line === codeBlockEnd) {
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

export function isMain(
  metaurl: string = import.meta.url,
  scriptpath: string = process.argv[1]
): boolean {
  if (metaurl.startsWith('file:')) {
    const modulePath = url.fileURLToPath(metaurl).replace(/\.\w+$/, '')
    const mainPath = fs.realpathSync(scriptpath).replace(/\.\w+$/, '')
    return mainPath === modulePath
  }

  return false
}

export function normalizeExt(ext?: string): string | undefined {
  return ext ? path.parse(`foo.${ext}`).ext : ext
}

// prettier-ignore
function getFilepath(cwd = '.', name = 'zx', _ext?: string): string {
  const ext = _ext || argv.ext || EXT
  return [
    name + ext,
    name + '-' + randomId() + ext,
  ]
    .map(f => path.resolve(process.cwd(), cwd, f))
    .find(f => !fs.existsSync(f))!
}
