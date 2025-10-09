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
import process from 'node:process'
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
  Fail,
} from './index.ts'
import { installDeps, parseDeps } from './deps.ts'
import { startRepl } from './repl.ts'
import { randomId } from './util.ts'
import { transformMarkdown } from './md.ts'
import { createRequire, type minimist } from './vendor.ts'

export { transformMarkdown } from './md.ts'

const EXT = '.mjs'
const EXT_RE = /^\.[mc]?[jt]sx?$/

// prettier-ignore
export const argv: minimist.ParsedArgs = parseArgv(process.argv.slice(2), {
  default: resolveDefaults({ ['prefer-local']: false } as any, 'ZX_', process.env, new Set(['env', 'install', 'registry'])),
  // exclude 'prefer-local' to let minimist infer the type
  string: ['shell', 'prefix', 'postfix', 'eval', 'cwd', 'ext', 'registry', 'env'],
  boolean: ['version', 'help', 'quiet', 'verbose', 'install', 'repl', 'experimental'],
  alias: { e: 'eval', i: 'install', v: 'version', h: 'help', l: 'prefer-local', 'env-file': 'env' },
  stopEarly: true,
  parseBoolean: true,
  camelCase: true,
})

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
   --prefer-local, -l   prefer locally installed packages and binaries
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

 ${chalk.italic('Full documentation:')} ${chalk.underline(Fail.DOCS_URL)}
`)
}

export async function main(): Promise<void> {
  if (argv.version) {
    console.log(VERSION)
    return
  }
  if (argv.help) {
    printUsage()
    return
  }
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

  await import('zx/globals')
  if (argv.repl) {
    await startRepl()
    return
  }
  argv.ext = normalizeExt(argv.ext)

  const { script, scriptPath, tempPath } = await readScript()
  await runScript(script, scriptPath, tempPath)
}

const rmrf = (p: string) => {
  if (!p) return

  lstat(p)?.isSymbolicLink()
    ? fs.unlinkSync(p)
    : fs.rmSync(p, { force: true, recursive: true })
}
async function runScript(
  script: string,
  scriptPath: string,
  tempPath: string
): Promise<void> {
  let nmLink = ''
  const rmTemp = () => {
    rmrf(tempPath)
    rmrf(nmLink)
  }
  try {
    if (tempPath) {
      scriptPath = tempPath
      await fs.writeFile(tempPath, script)
    }
    const cwd = path.dirname(scriptPath)
    if (typeof argv.preferLocal === 'string') {
      nmLink = linkNodeModules(cwd, argv.preferLocal)
    }
    if (argv.install) {
      await installDeps(parseDeps(script), cwd, argv.registry)
    }

    injectGlobalRequire(scriptPath)
    process.once('exit', rmTemp)

    // TODO: fix unanalyzable-dynamic-import to work correctly with jsr.io
    await import(url.pathToFileURL(scriptPath).toString())
  } finally {
    rmTemp()
  }
}

function linkNodeModules(cwd: string, external: string): string {
  const nm = 'node_modules'
  const alias = path.resolve(cwd, nm)
  const target =
    path.basename(external) === nm
      ? path.resolve(external)
      : path.resolve(external, nm)
  const aliasStat = lstat(alias)
  const targetStat = lstat(target)

  if (!targetStat?.isDirectory())
    throw new Fail(
      `Can't link node_modules: ${target} doesn't exist or is not a directory`
    )
  if (aliasStat?.isDirectory() && alias !== target)
    throw new Fail(`Can't link node_modules: ${alias} already exists`)
  if (aliasStat) return ''

  fs.symlinkSync(target, alias, 'junction')
  return alias
}

function lstat(p: string) {
  try {
    return fs.lstatSync(p)
  } catch {}
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
      throw new Fail('No script provided')
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
  return process.stdin.isTTY ? '' : stdin()
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
