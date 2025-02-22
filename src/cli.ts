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
  stdin,
  VERSION,
} from './index.js'
import { installDeps, parseDeps } from './deps.js'
import { startRepl } from './repl.js'
import { randomId, bufToString } from './util.js'
import { createRequire, type minimist } from './vendor.js'

const EXT = '.mjs'
const EXT_RE = /^\.[mc]?[jt]sx?$/

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
   --ext=<.mjs>         script extension
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
export const argv: minimist.ParsedArgs = parseArgv(process.argv.slice(2), {
  string: ['shell', 'prefix', 'postfix', 'eval', 'cwd', 'ext', 'registry', 'env'],
  boolean: ['version', 'help', 'quiet', 'verbose', 'install', 'repl', 'experimental', 'prefer-local'],
  alias: { e: 'eval', i: 'install', v: 'version', h: 'help', l: 'prefer-local', 'env-file': 'env' },
  stopEarly: true,
  parseBoolean: true,
  camelCase: true,
})

export async function main(): Promise<void> {
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
    await startRepl()
    return
  }

  const { script, scriptPath, tempPath } = await readScript()
  await runScript(script, scriptPath, tempPath)
}

async function runScript(
  script: string,
  scriptPath: string,
  tempPath: string
): Promise<void> {
  const rmTemp = () => fs.rmSync(tempPath, { force: true })
  try {
    if (tempPath) {
      scriptPath = tempPath
      await fs.writeFile(tempPath, script)
    }

    if (argv.install) {
      await installDeps(
        parseDeps(script),
        path.dirname(scriptPath),
        argv.registry
      )
    }

    injectGlobalRequire(scriptPath)
    process.once('exit', rmTemp)

    // TODO: fix unanalyzable-dynamic-import to work correctly with jsr.io
    await import(url.pathToFileURL(scriptPath).toString())
  } finally {
    rmTemp()
  }
}

async function readScript() {
  const [firstArg] = argv._
  let script = ''
  let scriptPath = ''
  let tempPath = ''
  let argSlice = 1

  if (argv.eval) {
    argSlice = 0
    script = argv.eval
    tempPath = getFilepath($.cwd, 'zx', argv.ext)
  } else if (!firstArg || firstArg === '-') {
    script = await readScriptFromStdin()
    tempPath = getFilepath($.cwd, 'zx', argv.ext)
    if (script.length === 0) {
      printUsage()
      process.exitCode = 1
      throw new Error('No script provided')
    }
  } else if (/^https?:/.test(firstArg)) {
    const { name, ext = argv.ext } = path.parse(new URL(firstArg).pathname)
    script = await readScriptFromHttp(firstArg)
    tempPath = getFilepath($.cwd, name, ext)
  } else {
    script = await fs.readFile(firstArg, 'utf8')
    scriptPath = firstArg.startsWith('file:')
      ? url.fileURLToPath(firstArg)
      : path.resolve(firstArg)
  }

  const { ext, base, dir } = path.parse(tempPath || scriptPath)
  if (ext === '' || (argv.ext && !EXT_RE.test(ext))) {
    tempPath = getFilepath(dir, base)
  }
  if (ext === '.md') {
    script = transformMarkdown(script)
    tempPath = getFilepath(dir, base)
  }
  if (argSlice) updateArgv(argv._.slice(argSlice))

  return { script, scriptPath, tempPath }
}

async function readScriptFromStdin(): Promise<string> {
  return !process.stdin.isTTY ? stdin() : ''
}

async function readScriptFromHttp(remote: string): Promise<string> {
  const res = await fetch(remote)
  if (!res.ok) {
    console.error(`Error: Can't get ${remote}`)
    process.exit(1)
  }
  return res.text()
}

export function injectGlobalRequire(origin: string): void {
  const __filename = path.resolve(origin)
  const __dirname = path.dirname(__filename)
  const require = createRequire(origin)
  Object.assign(globalThis, { __filename, __dirname, require })
}

export function transformMarkdown(buf: Buffer | string): string {
  const output = []
  const tabRe = /^(  +|\t)/
  const codeBlockRe =
    /^(?<fence>(`{3,20}|~{3,20}))(?:(?<js>(js|javascript|ts|typescript))|(?<bash>(sh|shell|bash))|.*)$/
  let state = 'root'
  let codeBlockEnd = ''
  let prevLineIsEmpty = true
  for (const line of bufToString(buf).split(/\r?\n/)) {
    switch (state) {
      case 'root':
        if (tabRe.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
          continue
        }
        const { fence, js, bash } = line.match(codeBlockRe)?.groups || {}
        if (!fence) {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
          continue
        }
        codeBlockEnd = fence
        if (js) {
          state = 'js'
          output.push('')
        } else if (bash) {
          state = 'bash'
          output.push('await $`')
        } else {
          state = 'other'
          output.push('')
        }
        break
      case 'tab':
        if (line === '') {
          output.push('')
        } else if (tabRe.test(line)) {
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
