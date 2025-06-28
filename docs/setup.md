# Setup

## Requirements
* Linux, macOS, or Windows
* JavaScript Runtime:
  * Node.js >= 12.17.0
  * Bun >= 1.0.0
  * Deno 1.x, 2.x
  * GraalVM Node.js
* Some kind of bash or PowerShell

## Install

::: code-group

```bash [npm]
npm install zx     # add -g to install globally
```

```bash [npx]
npx zx script.js         # run script without installing the zx package
npx zx@8.6.0 script.js   # pin to a specific zx version
```

```bash [yarn]
yarn add zx
```

```bash [pnpm]
pnpm add zx
```

```bash [bun]
bun install zx
```

```bash [deno]
deno install -A npm:zx

# zx requires additional permissions: --allow-read --allow-sys --allow-env --allow-run
```

```bash [jsr]
npx jsr add @webpod/zx
deno add jsr:@webpod/zx

# https://jsr.io/docs/using-packages
```

```bash [docker]
docker pull ghcr.io/google/zx:8.5.0
docker run -t ghcr.io/google/zx:8.5.0 -e="await \$({verbose: true})\`echo foo\`"
docker run -t -i -v ./:/script ghcr.io/google/zx:8.5.0 script/t.js
```

```bash [brew]
brew install zx
```

:::

### Channels

zx is distributed in several versions, each with its own set of features.

| Channel  | Description                                                                                  | Install              |
|----------|----------------------------------------------------------------------------------------------|----------------------|
| `latest` | Mainline releases with the latest features and improvements.                                 | `npm i zx`           |
| `lite`   | [A minimalistic version of zx](./lite), suitable for lightweight scripts.                    | `npm i zx@lite`      |
| `dev`    | Development snapshots with the latest changes, may be unstable.                              | `npm i zx@dev`       |
| `legacy` | Legacy supporting versions for compatibility with older scripts, no new features, only bugfixes | `npm i zx@<version>` |

Detailed comparison: [versions](./versions).

Please check the download sources carefully. Official links:

* [npmjs](https://www.npmjs.com/package/zx)
* [GH npm](https://github.com/google/zx/pkgs/npm/zx)
* [GH repo](https://github.com/google/zx)
* [GH docker](https://github.com/google/zx/pkgs/container/zx)
* [JSR](https://jsr.io/@webpod/zx)
* [Homebrew](https://github.com/Homebrew/homebrew-core/blob/master/Formula/z/zx.rb)

### Github
To fetch zx directly from the GitHub:
```bash
# Install via git
npm i google/zx
npm i git@github.com:google/zx.git

# Fetch from the GH pkg registry
npm i --registry=https://npm.pkg.github.com @google/zx
```

### Docker
If you'd prefer to run scripts in a container, you can pull the zx image from the [ghcr.io](https://ghcr.io).
[node:24-alpine](https://hub.docker.com/_/node) is used as [a base](https://github.com/google/zx/blob/main/dcr/Dockerfile).

```shell
docker pull ghcr.io/google/zx:8.5.0
docker run -t ghcr.io/google/zx:8.5.0 -e="await \$({verbose: true})\`echo foo\`"
docker run -t -i -v ./:/script ghcr.io/google/zx:8.5.0 script/t.js
```

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

It also contains built-in TypeScript libdefs. But `@types/fs-extra` and `@types/node` are required to be installed on user's side.

```bash
npm i -D @types/fs-extra @types/node
```

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
* Provide support for a wide range of Node.js versions: from [12 to 25](https://github.com/google/zx/blob/61d03329349770d90fda3c9e26f7ef09f869a096/.github/workflows/test.yml#L195).
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
