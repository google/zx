# API Reference

## `$.sync`
Zx provides both synchronous and asynchronous command executions, returns [`ProcessOutput`](./process-output) or [`ProcessPromise`](./process-promise) respectively.

```js
const list = await $`ls -la`
const dir = $.sync`pwd`
```

## `$({...})`

`$` object holds the default zx [configuration](./configuration), which is used for all execution. To specify a custom preset use `$` as factory:

```js
const $$ = $({
  verbose: false,
  env: {NODE_ENV: 'production'},
})

const env = await $$`node -e 'console.log(process.env.NODE_ENV)'`
const pwd = $$.sync`pwd`
const hello = $({quiet: true})`echo "Hello!"`
```

Moreover, presets are chainable:

```js
const $1 = $({ nothrow: true })
assert.equal((await $1`exit 1`).exitCode, 1)

const $2 = $1({ sync: true }) // Both {nothrow: true, sync: true} are applied
assert.equal($2`exit 2`.exitCode, 2)

const $3 = $({ sync: true })({ nothrow: true })
assert.equal($3`exit 3`.exitCode, 3)
```

### `$({input})`

The input option passes the specified `stdin` to the command.

```js
const p1 = $({ input: 'foo' })`cat`
const p2 = $({ input: Readable.from('bar') })`cat`
const p3 = $({ input: Buffer.from('baz') })`cat`
const p4 = $({ input: p3 })`cat`
const p5 = $({ input: await p3 })`cat`
```

### `$({signal})`

The signal option makes the process abortable.

```js
const {signal} = new AbortController()
const p = $({ signal })`sleep 9999`

setTimeout(() => signal.abort('reason'), 1000)
```

### `$({timeout})`

The timeout option makes the process autokillable after the specified delay.

```js
const p = $({timeout: '1s'})`sleep 999`
```

### `$({nothrow})`

The `nothrow` option suppresses errors and returns a `ProcessOutput` with details.

```js
const o1 = await $({nothrow: true})`exit 1`
o1.ok       // false
o1.exitCode // 1
o1.message  // exit code: 1 ...

const o2 = await $({nothrow: true, spawn() { throw new Error('BrokenSpawn') }})`echo foo`
o2.ok       // false
o2.exitCode // null
o2.message  // BrokenSpawn ...
```

The full options list:
```ts
interface Options {
  cwd:            string
  ac:             AbortController
  signal:         AbortSignal
  input:          string | Buffer | Readable | ProcessOutput | ProcessPromise
  timeout:        Duration
  timeoutSignal:  NodeJS.Signals
  stdio:          StdioOptions
  verbose:        boolean
  sync:           boolean
  env:            NodeJS.ProcessEnv
  shell:          string | true
  nothrow:        boolean
  prefix:         string
  postfix:        string
  quote:          typeof quote
  quiet:          boolean
  detached:       boolean
  preferLocal:    boolean | string | string[]
  spawn:          typeof spawn
  spawnSync:      typeof spawnSync
  store:          TSpawnStore
  log:            typeof log
  kill:           typeof kill
  killSignal:     NodeJS.Signals
  halt:           boolean
}
```
See also [Configuration](./configuration).

## `cd()`

Changes the current working directory.

```js
cd('/tmp')
await $`pwd` // => /tmp
```

Like `echo`, in addition to `string` arguments, `cd` accepts and trims
trailing newlines from `ProcessOutput` enabling common idioms like:

```js
cd(await $`mktemp -d`)
```

> ⚠️ `cd` invokes `process.chdir()` internally, so it does affect the global context. To keep `process.cwd()` in sync with separate `$` calls enable [syncProcessCwd()](#syncprocesscwd) hook.

## `fetch()`

A wrapper around the [node-fetch-native](https://www.npmjs.com/package/node-fetch-native)
package.

```js
const resp = await fetch('https://medv.io')
```

## `question()`

A wrapper around the [readline](https://nodejs.org/api/readline.html) package.

```js
const bear = await question('What kind of bear is best? ')
```

## `sleep()`

A wrapper around the `setTimeout` function.

```js
await sleep(1000)
```

## `echo()`

A `console.log()` alternative which can take [ProcessOutput](#processoutput).

```js
const branch = await $`git branch --show-current`

echo`Current branch is ${branch}.`
// or
echo('Current branch is', branch)
```

## `stdin()`

Returns the stdin as a string.

```js
const content = JSON.parse(await stdin())
```

## `within()`

Creates a new async context.

```js
await $`pwd` // => /home/path
$.foo = 'bar'

within(async () => {
  $.cwd = '/tmp'
  $.foo = 'baz'

  setTimeout(async () => {
    await $`pwd` // => /tmp
    $.foo // baz
  }, 1000)
})

await $`pwd` // => /home/path
$.foo // still 'bar'
```

```js
await $`node --version` // => v20.2.0

const version = await within(async () => {
  $.prefix += 'export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh; nvm use 16;'

  return $`node --version`
})

echo(version) // => v16.20.0
```

## `syncProcessCwd()`

Keeps the `process.cwd()` in sync with the internal `$` current working directory if it is changed via [cd()](#cd).

```ts
import {syncProcessCwd} from 'zx'

syncProcessCwd()
syncProcessCwd(false) // pass false to disable the hook
```

> This feature is disabled by default because of performance overhead.

## `retry()`

Retries a callback for a few times. Will return after the first
successful attempt, or will throw after specifies attempts count.

```js
const p = await retry(10, () => $`curl https://medv.io`)

// With a specified delay between attempts.
const p = await retry(20, '1s', () => $`curl https://medv.io`)

// With an exponential backoff.
const p = await retry(30, expBackoff(), () => $`curl https://medv.io`)
```

## `spinner()`

Starts a simple CLI spinner.

```js
await spinner(() => $`long-running command`)

// With a message.
await spinner('working...', () => $`sleep 99`)
```

And it's disabled for `CI` by default.

## `glob()`

The [globby](https://github.com/sindresorhus/globby) package.

```js
const packages = await glob(['package.json', 'packages/*/package.json'])
```

## `which()`

The [which](https://github.com/npm/node-which) package.

```js
const node = await which('node')
```

If nothrow option is used, returns null if not found.

```js
const pathOrNull = await which('node', { nothrow: true })
```

## `ps`

The [@webpod/ps](https://github.com/webpod/ps) package to provide a cross-platform way to list processes.

```js
const all = await ps.lookup()
const nodejs = await ps.lookup({ command: 'node' })
const children = await ps.tree({ pid: 123 })
const fulltree = await ps.tree({ pid: 123, recursive: true })
```

## `kill()`

A process killer.

```js
await kill(123)
await kill(123, 'SIGKILL')
```

## `tmpdir()`

Creates a temporary directory.

```js
t1 = tmpdir()       // /os/based/tmp/zx-1ra1iofojgg/
t2 = tmpdir('foo')  // /os/based/tmp/zx-1ra1iofojgg/foo/
```

## `tmpfile()`

Temp file factory.

```js
f1 = tmpfile()         // /os/based/tmp/zx-1ra1iofojgg
f2 = tmpfile('f2.txt')  // /os/based/tmp/zx-1ra1iofojgg/foo.txt
f3 = tmpfile('f3.txt', 'string or buffer')
f4 = tmpfile('f4.sh', 'echo "foo"', 0o744) // executable
```

## `minimist`

The [minimist](https://www.npmjs.com/package/minimist) package.

```js
const argv = minimist(process.argv.slice(2), {})
```

## `argv`

A minimist-parsed version of the `process.argv` as `argv`.

```js
if (argv.someFlag) {
  echo('yes')
}
```

Use minimist options to customize the parsing:

```js
const myCustomArgv = minimist(process.argv.slice(2), {
  boolean: [
    'force',
    'help',
  ],
  alias: {
    h: 'help',
  },
})
```

## `chalk`

The [chalk](https://www.npmjs.com/package/chalk) package.

```js
console.log(chalk.blue('Hello world!'))
```

## `fs`

The [fs-extra](https://www.npmjs.com/package/fs-extra) package.

```js
const {version} = await fs.readJson('./package.json')
```

## `os`

The [os](https://nodejs.org/api/os.html) package.

```js
await $`cd ${os.homedir()} && mkdir example`
```

## `path`

The [path](https://nodejs.org/api/path.html) package.

```js
await $`mkdir ${path.join(basedir, 'output')}`
```

## `yaml`

The [yaml](https://www.npmjs.com/package/yaml) package.

```js
console.log(YAML.parse('foo: bar').foo)
```

## `dotenv`

The [envapi](https://www.npmjs.com/package/envapi) package.  
An API to interact with environment vars in [dotenv](https://www.npmjs.com/package/dotenv) format.

```js
// parse
const raw = 'FOO=BAR\nBAZ=QUX'
const data = dotenv.parse(raw) // {FOO: 'BAR', BAZ: 'QUX'}
await fs.writeFile('.env', raw)

// load
const env = dotenv.load('.env')
await $({ env })`echo $FOO`.stdout // BAR

// config
dotenv.config('.env')
process.env.FOO // BAR
```

## `quote()`

Default bash quoting function.

```js
quote("$FOO") // "$'$FOO'"
```

## `quotePowerShell()`

PowerShell specific quoting.

```js
quotePowerShell("$FOO") // "'$FOO'"
```

## `useBash()`

Enables bash preset: sets `$.shell` to `bash` and `$.quote` to `quote`.

```js
useBash()
```

## `usePowerShell()`

Switches to PowerShell. Applies the `quotePowerShell` for quoting.

```js
usePowerShell()
```

## `usePwsh()`

Sets pwsh (PowerShell v7+) as `$.shell` default.

```js
usePwsh()
```
