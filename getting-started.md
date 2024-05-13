# Getting Started

## Overview

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

const branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

const name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash is great, but when it comes to writing more complex scripts,
many people prefer a more convenient programming language.
JavaScript is a perfect choice, but the Node.js standard library
requires additional hassle before using. The `zx` package provides
useful wrappers around `child_process`, escapes arguments and
gives sensible defaults.

## Install

::: code-group

```bash [node]
npm install zx
```

```bash [bun]
bun install zx
```

```bash [deno]
deno install -A npm:zx
```

```bash [brew]
brew install zx
```

:::

## Usage

Write your scripts in a file with an `.mjs` extension in order to
use `await` at the top level. If you prefer the `.js` extension,
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

Or via the [CLI](cli.md):

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

Executes a given command using the `spawn` func
and returns [`ProcessPromise`](process-promise.md). It supports both sync and async modes.

```js
const list = await $`ls -la`
const dir = $.sync`pwd`
```

Everything passed through `${...}` will be automatically escaped and quoted.

```js
const name = 'foo & bar'
await $`mkdir ${name}`
```

**There is no need to add extra quotes.** Read more about it in
[quotes](quotes.md).

You can pass an array of arguments if needed:

```js
const flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

If the executed program returns a non-zero exit code,
[`ProcessOutput`](#processoutput) will be thrown.

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
  readonly stdout: string
  readonly stderr: string
  readonly signal: string
  readonly exitCode: number

  toString(): string // Combined stdout & stderr.
}
```

The output of the process is captured as-is. Usually, programs print a new
line `\n` at the end.
If `ProcessOutput` is used as an argument to some other `$` process,
**zx** will use stdout and trim the new line.

```js
const date = await $`date`
await $`echo Current date is ${date}.`
```

## License

[Apache-2.0](https://github.com/google/zx/blob/main/LICENSE)

Disclaimer: _This is not an officially supported Google product._
