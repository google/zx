# The zx architecture
This section helps to better understand the `zx` concepts and logic, and will be useful for those who want to become a project contributor, make tools based on it, or create something similar from scratch.

## High-level modules
| Module                                                                  | Description                                                         |
|-------------------------------------------------------------------------|---------------------------------------------------------------------|
| [zurk](https://github.com/webpod/zurk)                                  | Execution engine for spawning and managing child processes.         |
| [./src/core.ts](https://github.com/google/zx/blob/main/src/core.ts)     | `$` factory, presets, utilities, high-level APIs.                   |
| [./src/goods.ts](https://github.com/google/zx/blob/main/src/goods.ts)   | Utilities for common tasks like fs ops, glob search, fetching, etc. |
| [./src/cli.ts](https://github.com/google/zx/blob/main/src/cli.ts)       | CLI interface and scripts pre-processors.                           |
| [./src/deps.ts](https://github.com/google/zx/blob/main/src/deps.ts)     | Dependency analyzing and installation.                              |
| [./src/vendor.ts](https://github.com/google/zx/blob/main/src/vendor.ts) | Third-party libraries.                                              |
| [./src/utils.ts](https://github.com/google/zx/blob/main/src/utils.ts)   | Generic helpers.                                                    |
| [./src/md.ts](https://github.com/google/zx/blob/main/src/md.ts)         | Markdown scripts extractor.                                         |
| [./src/error.ts](https://github.com/google/zx/blob/main/src/error.ts)   | Error handling and formatting.                                      |
| [./src/global.ts](https://github.com/google/zx/blob/main/src/global.ts) | Global injectors.                                                   |


## Core design

### `Options`
A set of options for `$` and `ProcessPromise` configuration. `defaults` holds the initial library preset. `Snapshot` captures the current `Options `context and attaches isolated subparts.

### `$`
A piece of template literal magic.
```ts
interface Shell<
  S = false,
  R = S extends true ? ProcessOutput : ProcessPromise,
> {
  (pieces: TemplateStringsArray, ...args: any[]): R
  <O extends Partial<Options> = Partial<Options>, R = O extends { sync: true } ? Shell<true> : Shell>(opts: O): R
  sync: {
    (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput
    (opts: Partial<Omit<Options, 'sync'>>): Shell<true>
  }
}

$`cmd ${arg}`             // ProcessPromise
$(opts)`cmd ${arg}`       // ProcessPromise
$.sync`cmd ${arg}`        // ProcessOutput
$.sync(opts)`cmd ${arg}`  // ProcessOutput
```

The `$` factory creates `ProcessPromise` instances and bounds with snapshot-context via `Proxy` and `AsyncLocalStorage`. The trick:
```ts
const storage = new AsyncLocalStorage<Options>()

const getStore = () => storage.getStore() || defaults

function within<R>(callback: () => R): R {
  return storage.run({ ...getStore() }, callback)
}
// Inside $ factory ...
const opts = getStore()
if (!Array.isArray(pieces)) {
  return function (this: any, ...args: any) {
    return within(() => Object.assign($, opts, pieces).apply(this, args))
  }
}
```

### `ProcessPromise` 
A promise-inherited class represents and operates a child process, provides methods for piping, killing, response formatting.

#### Lifecycle
| Stage        | Description            |
|--------------|------------------------|
| `initial`    | Blank instance         |
| `halted`     | Awaits running         |
| `running`    | Process in action      |
| `fulfilled`  | Successfully completed |
| `rejected`   | Failed                 |

| Gear         | Description                                                                                 |
|--------------|---------------------------------------------------------------------------------------------|
| `build()`    | Produces `cmd` from template and context, applies `quote` to arguments                      |
| `run()`      | Spawns the process and captures its data via `zurk` events listeners                        |
| `finalize()` | Assigns the result to the instance: analyzes status code, invokes `_resolve()`, `_reject()` |

#### Piping
The remarkable part is `pipe()` and `_pipe()` interactions: the first provides a facade, the second binds different streams with acceptors. We use initialization inside static scope to comply with TS method visibility restrictions and to avoid extra `Proxy` usage:
```ts
const p = $`cmd`
const crits = await p.pipe.stderr`grep critical`
const names = await p.pipe.stdout`grep name`
```

Another `pipe()` superpower is an internal recorder. It allows binding processes at any stage w/o data loss, even if settled.
```ts
const onData = (chunk: string | Buffer) => from.write(chunk)
const fill = () => {
  for (const chunk of source) from.write(chunk)
}

ee.once(source, () => {
  fill()                    // 1. Pulling previous records
  ee.on(source, onData)     // 2. Listening for new data
}).once('end', () => {
  ee.removeListener(source, onData)
  from.end()
})
```

Wayback machine in action:
```ts
const p = $`cmd`
await p
await p.pipe`grep name` // Still works, but `p` is settled
```

### `ProcessOutput`
A class that represents the output of a `ProcessPromise`. It provides methods to access the process's stdout, stderr, exit code and extra methods for formatting the output and checking the process's success.

### `Fail`
Consolidates error handling functionality across the zx library: errors codes mapping, formatting, stack parsing.

## CLI
zx provides CLI with embedded script preprocessor to construct an execution context (apply presets, inject global vars) and to install the required deps. Then runs the specified script.

| Helper         | Description                                                                                                                                                                                                                                               |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `main()`       | Initializes a preset from flags, env vars and pushes the reader.                                                                                                                                                                                                |
| `readScript()` | Fetches, parses and transforms the specified source into a runnable form. `stdin` reader, `https` loader and `md` transformer act right here. Deps analyzer internally relies on [depseek](https://www.npmjs.com/package/depseek) and inherits its limitations |
| `runScript()`  | Executes the script in the target context via async `import()`, handles temp assets after.                                                                                                                                                                 |


## Building
In the early stages of the project, we [had some difficulties](https://dev.to/antongolub/how-and-why-do-we-bundle-zx-1ca6) with zx packaging. We couldn't find a suitable tool for assembly, so we made our own toolkit based on [esbuild](https://github.com/evanw/esbuild) and [dts-bundle-generator](https://github.com/timocov/dts-bundle-generator). This process is divided into several scripts.

| Script                                                                                       | Description                                                            |
|----------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| [`./scripts/build-dts.mjs`](https://github.com/google/zx/blob/main/scripts/build-dts.mjs)    | Extracts and merges 3rd-party types, generates `dts` files.            |
| [`./scripts/build-js.mjs`](https://github.com/google/zx/blob/main/scripts/build-js.mjs)      | Produces [hybrid bundles](./setup#hybrid) for each package entry point |
| [`./scripts/build-jsr.mjs`](https://github.com/google/zx/blob/main/scripts/build-jsr.mjs)    | Builds extra assets for [JSR](https://jsr.io/@webpod/zx) publishing    |
| [`./scripts/build-tests.mjs`](https://github.com/google/zx/blob/main/scripts/build-test.mjs) | Generates autotests to verify exports consistency                      |

Corresponding tasks are defined in the `package.json.scripts`:
```json
{
  "prebuild":     "rm -rf build",
  "build":        "npm run build:js && npm run build:dts && npm run build:tests",
  "build:js":     "node scripts/build-js.mjs --format=cjs --hybrid --entry=src/*.ts:!src/error.ts:!src/repl.ts:!src/md.ts:!src/log.ts:!src/globals-jsr.ts:!src/goods.ts && npm run build:vendor",
  "build:vendor": "node scripts/build-js.mjs --format=cjs --entry=src/vendor-*.ts --bundle=all --external='./internals.ts'",
  "build:tests":  "node scripts/build-tests.mjs",
  "build:dts":    "tsc --project tsconfig.json && rm build/repl.d.ts build/globals-jsr.d.ts && node scripts/build-dts.mjs",
  "build:dcr":    "docker build -f ./dcr/Dockerfile . -t zx",
  "build:jsr":    "node scripts/build-jsr.mjs"
}
```

## Testing

We understand the importance, impact and risks of the tool and invest significant efforts in comprehensive research of its quality, reliability and safety. Therefore, we use an extensive set of tools and testing scenarios.

First, we inspect not how the code was written, but how it actually works. Tests mainly focus on prod bundles, `pretest` ensures they are actual.
```json
{
  "pretest": "npm run build"
}
```

A basic set of implementation correctness checks is provided by unit tests. We also evaluate coverage to ensure that areas of code are not missed. 
```json
{
  "test:unit": "node --experimental-transform-types ./test/all.test.js",
  "test:coverage": "c8 -c .nycrc --check-coverage npm run test:unit"
}
```

Next, we control the contents of all the artifacts and examine their functionality.
```json
{
  "test:npm": "node ./test/it/build-npm.test.js",
  "test:jsr": "node ./test/it/build-jsr.test.js",
  "test:dcr": "node ./test/it/build-dcr.test.js"
}
```

Bundle code duplication issues are highlighted through size check.
```json
{
  "test:size": "size-limit"
}
```

Static analyzers are responsible for code quality.
```json
{
  "fmt:check": "prettier --check .",
  "test:circular": "madge --circular src/*"
}
```

Type checking examines declarations and compatibility with different loaders and transpilers.
```json
{
  "test:types": "tsd",
  "test:smoke:strip-types": "node --experimental-strip-types test/smoke/ts.test.ts",
  "test:smoke:tsx": "tsx test/smoke/ts.test.ts",
  "test:smoke:tsc": "cd test/smoke && mkdir -p node_modules && ln -s ../../../  ./node_modules/zx; ../../node_modules/typescript/bin/tsc -v && ../../node_modules/typescript/bin/tsc --esModuleInterop --module node16 --rootDir . --outdir ./temp ts.test.ts && node ./temp/ts.test.js",
  "test:smoke:ts-node": "cd test/smoke && node --loader ts-node/esm ts.test.ts"
}
```

We also check compatibility with all the target [runtimes x OS variants](https://github.com/google/zx/blob/main/.github/workflows/test.yml).
```json
{
  "test:smoke:bun": "bun test ./test/smoke/bun.test.js && bun ./test/smoke/node.test.mjs",
  "test:smoke:win32": "node ./test/smoke/win32.test.js",
  "test:smoke:deno": "deno test ./test/smoke/deno.test.js --allow-read --allow-sys --allow-env --allow-run",
}
```

CJS and EMS exports are verified separately.
```json
{
  "test:smoke:cjs": "node ./test/smoke/node.test.cjs",
  "test:smoke:mjs": "node ./test/smoke/node.test.mjs"
}
```

Finally, we check the license and supply chain security issues.
```json
{
  "test:license": "node ./test/extra.test.js",
  "test:audit": "npm audit fix",
  "test:workflow": "zizmor .github/workflows -v -p --min-severity=medium"
}
```
