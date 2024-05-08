# Package

## Hybrid
zx is distributed as a [hybrid package](https://2ality.com/2019/10/hybrid-npm-packages.html): it provides both CJS an ESM entry points.

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

## Bundled

We use [esbuild](https://dev.to/antongolub/how-and-why-do-we-bundle-zx-1ca6) to produce a static build that allows us to solve several issues at once:
* Reduce the pkg size and install time.
* Make npx (yarn dlx / bunx) invocations reproducible.
* Provide support for wide range of Node.js versions: from 12 to 22.
* Make auditing easier: complete code in one place.

## Composite

zx exports several entry points adapted for different use cases:
* `zx` – the main entry point, provides all the features.
* `zx/global` – to populate the global scope with zx functions.
* `zx/cli` – to run zx scripts from the command line.
* `zx/core` – to use zx template spawner as part of 3rd party libraries with alternating set of utilities.

