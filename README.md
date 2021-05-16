# 🐚 zx

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

When using `zx` via the executable or a shebang, all of the functions
(`$`, `cd`, `fetch`, etc) are available straight away without any imports.

### ``$`command` ``

Executes a given string using the `exec` function from the
`child_process` package and returns `Promise<ProcessOutput>`.

```js
let count = parseInt(await $`ls -1 | wc -l`)
console.log(`Files count: ${count}`)
```

For example, to upload files in parallel:

```js
let hosts = [...]
await Promise.all(hosts.map(host =>
  $`rsync -azP ./src ${host}:/var/www`  
))
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

### `ProcessOutput`

```ts
class ProcessOutput {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  toString(): string
}
```

### `cd()`

Changes the current working directory.

```js
cd('/tmp')
await $`pwd` // outputs /tmp
```

### `fetch()`

A wrapper around the [node-fetch](https://www.npmjs.com/package/node-fetch) package.

```js
let resp = await fetch('http://wttr.in')
if (resp.ok) {
  console.log(await resp.text())
}
```

### `question()`

A wrapper around the [readline](https://nodejs.org/api/readline.html) package.

```ts
type QuestionOptions = { choices: string[] }

function question(query?: string, options?: QuestionOptions): Promise<string>
```

Usage:

```js
let username = await question('What is your username? ')
let token = await question('Choose env variable: ', {
  choices: Object.keys(process.env)
})
```

### `sleep()`

A wrapper around the `setTimeout` function.

```ts
function sleep(ms: number): Promise<void>
```

Usage:

```js
await sleep(1000)
```

### `chalk` package

The [chalk](https://www.npmjs.com/package/chalk) package is available without 
importing inside scripts.

```js
console.log(chalk.blue('Hello world!'))
```

### `fs` package

The [fs](https://nodejs.org/api/fs.html) package is available without importing 
inside scripts. It is asynchronous by default.

```js
let content = await fs.readFile('./package.json')
```

### `os` package

The [os](https://nodejs.org/api/os.html) package is available without importing
inside scripts.

```js
await $`cd ${os.homedir()} && mkdir example`
```

### `$.shell`

Specifies what shell is used. Default is `which bash`.

```js
$.shell = '/usr/bin/bash'
```

### `$.prefix`

Specifies the command what will be prefixed to all commands run.

Default is `set -euo pipefail;`.

### `$.quote`

Specifies a function what will be used for escaping special characters during 
command substitution.

Default is the [shq](https://www.npmjs.com/package/shq) package.

### `$.verbose`

Specifies verbosity. Default is `true`.

In verbose mode, the `zx` prints all executed commands alongside with their outputs.
This is the same as using `set -x` in Bash.

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

### Importing from other scripts

It is possible to make use of `$` and other functions via explicit imports:

```js
#!/usr/bin/env node
import {$} from 'zx'
await $`date`
```

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

### Executing remote scripts

If the argument to the `zx` executable starts with `https://`, the file will be 
downloaded and executed.

```bash
zx https://medv.io/example-script.mjs
```

## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
