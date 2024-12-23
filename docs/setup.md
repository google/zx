# Setup

## Requirements
* Linux, macOS, or Windows
* JavaScript Runtime:
  * Node.js 12.17.0 or later
  * Bun 1.0.0 or later
  * Deno 1.x, 2.x
* Some kind of bash or PowerShell

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

# zx requires additional permissions: --allow-read --allow-sys --allow-env --allow-run
```

```bash [brew]
brew install zx
```

:::

Dev snapshot versions are published to npm under the [`dev` tag](https://www.npmjs.com/package/zx?activeTab=versions): `npm i zx@dev`.

## Bash

zx mostly relies on bash, so make sure it's available in your environment. If you're on Windows, consider using [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install) or [Git Bash](https://git-scm.com/downloads).
By default, zx looks for bash binary, but you can switch to PowerShell by invoking `usePowerShell()` or `usePwsh()`.

```js
import { useBash, usePowerShell, usePwsh } from 'zx'

usePowerShell() // Use PowerShell.exe
usePwsh()       // Rely on pwsh binary (PowerShell v7+)
useBash()       // Switch back to bash
```

## Package

### Hybrid
zx is distributed as a [hybrid package](https://2ality.com/2019/10/hybrid-npm-packages.html): it provides both CJS and ESM entry points.

```js
import { $ } from 'zx'

const { $ } = require('zx')
```

It has also built-in TypeScript libdefs.

```ts
import { type Options } from 'zx'

const opts: Options = {
  quiet: true,
  timeout: '5s'
}
```

### Bundled

We use [esbuild](https://dev.to/antongolub/how-and-why-do-we-bundle-zx-1ca6) to produce a static build that allows us to solve several issues at once:
* Reduce the pkg size and install time.
* Make npx (yarn dlx / bunx) invocations reproducible.
* Provide support for wide range of Node.js versions: from 12 to 23.
* Make auditing easier: complete code is in one place.

### Composite

zx exports several entry points adapted for different use cases:
* `zx` – the main entry point, provides all the features.
* `zx/global` – to populate the global scope with zx functions.
* `zx/cli` – to run zx scripts from the command line.
* `zx/core` – to use zx template spawner as part of 3rd party libraries with alternating set of utilities.

### Typed
The library is written in TypeScript 5 and provides comprehensive type definitions for TS users.
* Libdefs are bundled via [dts-bundle-generator](https://github.com/timocov/dts-bundle-generator).
* Compatible with TS 4.0 and later.
* Requires `@types/node` and `@types/fs-extra` to be installed.
