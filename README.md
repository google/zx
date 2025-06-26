# 🐚 zx

> [!TIP]
> **zx@6** development has been discontinued. Critical bug fixes and vulnerability fixes only considered.
>
> But the project is moving forward. [There are a lot](https://github.com/google/zx/releases) of cool features, improvements, compatibility enhancements 🚀
> Please follow the [migration guide](https://google.github.io/zx/migration-from-v7) to upgrade to the latest. If something doesn't work, feel free to start a new [issue](https://github.com/google/zx/issues) or [discussion](https://github.com/google/zx/discussions).

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

let branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

let name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash is great, but when it comes to writing scripts, 
people usually choose a more convenient programming language.
JavaScript is a perfect choice, but standard Node.js library 
requires additional hassle before using. The `zx` package provides
useful wrappers around `child_process`, escapes arguments and
gives sensible defaults.

## Install

```bash
npm i -g zx
```

**Requirement**: Node version >= 16.0.0

## Goods

[$](#command-) · [cd()](#cd) · [fetch()](#fetch) · [question()](#question) · [sleep()](#sleep) · [nothrow()](#nothrow) · [quiet()](#quiet) ·
[chalk](#chalk-package) · [fs](#fs-package) · [os](#os-package) · [path](#path-package) · [globby](#globby-package) · [yaml](#yaml-package) · [minimist](#minimist-package) · [which](#which-package) ·
[__filename](#__filename--__dirname) · [__dirname](#__filename--__dirname) · [require()](#require)

## Documentation

Write your scripts in a file with `.mjs` extension in order to 
be able to use `await` on top level. If you prefer the `.js` extension,
wrap your scripts in something like `void async function () {...}()`.

Add the following shebang to the beginning of your `zx` scripts:
```bash
#!/usr/bin/env zx
```

Now you will be able to run your script like so:
```bash
chmod +x ./script.mjs
./script.mjs
```

Or via the `zx` executable:

```bash
zx ./script.mjs
```

All functions (`$`, `cd`, `fetch`, etc) are available straight away 
without any imports. 

Or import globals explicitly (for better autocomplete in VS Code).

```js
import 'zx/globals'
```

### ``$`command` ``

Executes a given string using the `spawn` function from the
`child_process` package and returns `ProcessPromise<ProcessOutput>`.

Everything passed through `${...}` will be automatically escaped and quoted.

```js
let name = 'foo & bar'
await $`mkdir ${name}`
```

**There is no need to add extra quotes.** Read more about it in 
[quotes](docs/quotes.md).

You can pass an array of arguments if needed:

```js
let flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

If the executed program returns a non-zero exit code,
`ProcessOutput` will be thrown.

```js
try {
  await $`exit 1`
} catch (p) {
  console.log(`Exit code: ${p.exitCode}`)
  console.log(`Error: ${p.stderr}`)
}
```

### `ProcessPromise`

```ts
class ProcessPromise<T> extends Promise<T> {
  readonly stdin: Writable
  readonly stdout: Readable
  readonly stderr: Readable
  readonly exitCode: Promise<number>
  pipe(dest): ProcessPromise<T>
  kill(signal = 'SIGTERM'): Promise<void>
}
```

The `pipe()` method can be used to redirect stdout:

```js
await $`cat file.txt`.pipe(process.stdout)
```

Read more about [pipelines](docs/pipelines.md).

### `ProcessOutput`

```ts
class ProcessOutput {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
  readonly signal: 'SIGTERM' | 'SIGKILL' | ...
  toString(): string
}
```

## Functions

### `cd()`

Changes the current working directory.

```js
cd('/tmp')
await $`pwd` // outputs /tmp
```

### `fetch()`

A wrapper around the [node-fetch](https://www.npmjs.com/package/node-fetch) package.

```js
let resp = await fetch('https://wttr.in')
if (resp.ok) {
  console.log(await resp.text())
}
```

### `question()`

A wrapper around the [readline](https://nodejs.org/api/readline.html) package.

Usage:

```js
let bear = await question('What kind of bear is best? ')
let token = await question('Choose env variable: ', {
  choices: Object.keys(process.env)
})
```

In second argument, array of choices for Tab autocompletion can be specified.
  
```ts
function question(query?: string, options?: QuestionOptions): Promise<string>
type QuestionOptions = { choices: string[] }
```

### `sleep()`

A wrapper around the `setTimeout` function.

```js
await sleep(1000)
```

### `nothrow()`

Changes behavior of `$` to not throw an exception on non-zero exit codes.

```ts
function nothrow<P>(p: P): P
```

Usage:

```js
await nothrow($`grep something from-file`)

// Inside a pipe():

await $`find ./examples -type f -print0`
  .pipe(nothrow($`xargs -0 grep something`))
  .pipe($`wc -l`)
```

If only the `exitCode` is needed, you can use the next code instead:

```js
if (await $`[[ -d path ]]`.exitCode == 0) {
  ...
}

// Equivalent of:

if ((await nothrow($`[[ -d path ]]`)).exitCode == 0) {
  ...
}
```
### `quiet()`

Changes behavior of `$` to disable verbose output.

```ts
function quiet<P>(p: P): P
```

Usage:

```js
await quiet($`grep something from-file`)
// Command and output will not be displayed.
```

## Packages

Following packages are available without importing inside scripts.

### `chalk` package

The [chalk](https://www.npmjs.com/package/chalk) package.

```js
console.log(chalk.blue('Hello world!'))
```

### `fs` package

The [fs-extra](https://www.npmjs.com/package/fs-extra) package.

```js
let content = await fs.readFile('./package.json')
```

### `os` package

The [os](https://nodejs.org/api/os.html) package.

```js
await $`cd ${os.homedir()} && mkdir example`
```

### `path` package

The [path](https://nodejs.org/api/path.html) package.

```js
await $`mkdir ${path.join(basedir, 'output')}`
```

### `globby` package

The [globby](https://github.com/sindresorhus/globby) package.

```js
let packages = await globby(['package.json', 'packages/*/package.json'])

let pictures = globby.globbySync('content/*.(jpg|png)')
```

Also, globby available via the `glob` shortcut:

```js
await $`svgo ${await glob('*.svg')}`
```

### `yaml` package

The [yaml](https://www.npmjs.com/package/yaml) package.

```js
console.log(YAML.parse('foo: bar').foo)
```

### `minimist` package

The [minimist](https://www.npmjs.com/package/minimist) package.

Available as global const `argv`.

### `which` package

The [which](https://github.com/npm/node-which) package.

```js
let node = await which('node')

let node = which.sync('node')
```

## Configuration

### `$.shell`

Specifies what shell is used. Default is `which bash`.

```js
$.shell = '/usr/bin/bash'
```

Or use a CLI argument: `--shell=/bin/bash`

### `$.spawn`

Specifies a `spawn` api. Defaults to `require('child_process').spawn`.

### `$.maxBuffer`

Specifies the largest number of bytes allowed on stdout or stderr.
Defaults to `200 * 1024 * 1024` (200 MiB).

### `$.prefix`

Specifies the command that will be prefixed to all commands run.

Default is `set -euo pipefail;`.

Or use a CLI argument: `--prefix='set -e;'`

### `$.quote`

Specifies a function for escaping special characters during 
command substitution.

### `$.verbose`

Specifies verbosity. Default is `true`.

In verbose mode, the `zx` prints all executed commands alongside with their 
outputs.

Or use a CLI argument `--quiet` to set `$.verbose = false`.

### `$.logOutput`

Specifies zx debug channel: `stdout/stderr`. Defaults to `stderr`.

### `$.logFormat`

Specifies zx log output formatter. Defaults to `identity`.

```js
// Nice place to add masker, if you pass creds to zx methods
$.logFormat = (msg) => msg.map(m => m.toUpperCase())
```

### `$.logIgnore`

Specifies log events to filter out. Defaults to `''`, so everything is being logged.

```js
$.logIgnore = ['cd', 'fetch']
cd('/tmp/foo')
$.fetch('https://example.com')
// `$ cd /tmp/foo` is omitted
// `$ fetch https://example.com` is not printed too

$.logIgnore = 'cmd'
$`echo 'test'`
// prints `test` w/o `$ echo 'test'`
```

### `$.logPrint`

Specifies event logging stream. Defaults to `process.stdout/process.stderr`.

```js
let stdout = ''
let stderr = ''

$.logPrint = (data, err) => {
  if (data) stdout += data
  if (err) stderr += err
}
```

### `$.env`

Specifies env map. Defaults to `process.env`.

## Polyfills 

### `__filename` & `__dirname`

In [ESM](https://nodejs.org/api/esm.html) modules, Node.js does not provide
`__filename` and `__dirname` globals. As such globals are really handy in scripts,
`zx` provides these for use in `.mjs` files (when using the `zx` executable).

### `require()`

In [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
modules, the `require()` function is not defined.
The `zx` provides `require()` function, so it can be used with imports in `.mjs`
files (when using `zx` executable).

```js
let {version} = require('./package.json')
```

## Experimental

The zx also provides a few experimental functions. Please leave a feedback about 
those features in [the discussion](https://github.com/google/zx/discussions/299).
To enable new features via CLI pass `--experimental` flag.

### `retry()`

Retries a command a few times. Will return after the first
successful attempt, or will throw after specifies attempts count.

```js
import {retry} from 'zx/experimental'

let {stdout} = await retry(5)`curl localhost`

// with a specified delay between attempts
let {stdout} = await retry(3, 500)`npm whoami`
```

### `echo()`

A `console.log()` alternative which can take [ProcessOutput](#processoutput).

```js
import {echo} from 'zx/experimental'

let branch = await $`git branch --show-current`

echo`Current branch is ${branch}.`
// or
echo('Current branch is', branch)
```

### `startSpinner()`

Starts a simple CLI spinner, and returns `stop()` function.

```js
import {startSpinner} from 'zx/experimental'

let stop = startSpinner()
await $`long-running command`
stop()
```

### `withTimeout()`

Runs and sets a timeout for a cmd.

```js
import {withTimeout} from 'zx/experimental'

await withTimeout(100, 'SIGTERM')`sleep 9999`
```

### `ctx()`

[async_hooks](https://nodejs.org/api/async_hooks.html)-driven scope isolator.
Creates a separate zx-context for the specified function.

```js
import {ctx} from 'zx/experimental'

const _$ = $
ctx(async ($) => {
  await sleep(10)
  cd('/foo')
  // $.cwd refers to /foo
  // _$.cwd === $.cwd
})

ctx(async ($) => {
  await sleep(20)
  // _$.cwd refers to /foo
  // but _$.cwd !== $.cwd
})

const ref = $.bind(null)
ctx(($) => {
  ref === $ // true
}, ref)
```

### `log()`

The logger. Accepts config via `$.log*` options.

```js
import {log} from 'zx/experimental'

log({scope: 'foo', verbose: 1, output: 'stderr'}, 'some', 'data')
// some data
```


## FAQ

### Passing env variables

```js
process.env.FOO = 'bar'
await $`echo $FOO`
```

### Passing array of values

If array of values passed as argument to `$`, items of the array will be escaped
individually and concatenated via space.

Example:
```js
let files = [...]
await $`tar cz ${files}`
```

### Importing from other scripts

It is possible to make use of `$` and other functions via explicit imports:

```js
#!/usr/bin/env node
import {$} from 'zx'
await $`date`
```

### Scripts without extensions

If script does not have a file extension (like `.git/hooks/pre-commit`), zx
assumes that it is an [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
module.

### Markdown scripts

The `zx` can execute scripts written in markdown 
([docs/markdown.md](docs/markdown.md)):

```bash
zx docs/markdown.md
```

### TypeScript scripts
 
```ts
import {$} from 'zx'
// Or 
import 'zx/globals'

void async function () {
  await $`ls -la`
}()
```

Use [ts-node](https://github.com/TypeStrong/ts-node#native-ecmascript-modules) as
a esm node [loader](https://nodejs.org/api/esm.html#esm_experimental_loaders).

```bash
node --loader ts-node/esm script.ts
```

You must set [`"type": "module"`](https://nodejs.org/api/packages.html#packages_type) 
in `package.json` and [`"module": "ESNext"`](https://www.typescriptlang.org/tsconfig/#module) 
in `tsconfig.json`.

```json
{
  "type": "module"
}
```

```json
{
  "compilerOptions": {
    "module": "ESNext"
  }
}
```


### Executing remote scripts

If the argument to the `zx` executable starts with `https://`, the file will be
downloaded and executed.

```bash
zx https://medv.io/game-of-life.js
```

### Executing scripts from stdin

The `zx` supports executing scripts from stdin.

```js
zx <<'EOF'
await $`pwd`
EOF
```

### Attaching .bash_profile/.zshrc

By default `child_process` does not include aliases and bash functions. 
But you are still able to do it by hand. Just attach necessary directives to `$.prefix`.

```js
$.prefix += 'export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh; '
await $`nvm -v`
```

### Using GitHub Actions

Default GitHub Action runner comes with npx installed.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build
      env:
        FORCE_COLOR: 3
      run: |
        npx zx <<'EOF'
        await $`...`
        EOF
```

### Customizing

You can build your very own custom zx version that best suits your needs.
```ts
// index.js
import {$} from 'zx'

$.quote = () => {}
$.extraFn = async () => {
    await $`ping example.com`
    await $`npm whoami`
}

// cli.js
#!/usr/bin/env node

import './index.js'
import 'zx/cli'

// script.mjs
await $.extraFn()

// zx-custom script.mjs
```

## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
