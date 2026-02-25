# Process Promise

The `$` returns a `ProcessPromise` instance, which inherits native `Promise`. When resolved, it becomes a [`ProcessOutput`](./process-output.md).

```js
const p = $`command` // ProcessPromise
const o = await p    // ProcessOutput
```

By default, `$` spawns a new process immediately, but you can delay the start to trigger in manually.

```ts
const p = $({halt: true})`command`
const o = await p.run()
```

## `stage`

Shows the current process stage: `initial` | `halted` | `running` | `fulfilled` | `rejected`

```ts
const p = $`echo foo`
p.stage // 'running'
await p
p.stage // 'fulfilled'
```


## `stdin`

Returns a writable stream of the stdin process. Accessing
this getter will trigger execution of a subprocess with [`stdio('pipe')`](#stdio).

Do not forget to end the stream.

```js
const p = $`while read; do echo $REPLY; done`
p.stdin.write('Hello, World!\n')
p.stdin.end()
```

By default, each process is created with stdin in _inherit_ mode.

## `stdout`/`stderr`

Returns a readable streams of stdout/stderr process.

```js
const p = $`npm init`
for await (const chunk of p.stdout) {
  echo(chunk)
}
```

## `exitCode`

Returns a promise which resolves to the exit code of the process.

```js
if (await $`[[ -d path ]]`.exitCode == 0) {
// ...
}
```

## `json(), text(), lines(), buffer(), blob()`

Output formatters collection.

```js
const p = $`echo 'foo\nbar'`

await p.text()        // foo\n\bar\n
await p.text('hex')   // 666f6f0a0861720a
await p.buffer()      // Buffer.from('foo\n\bar\n')
await p.lines()       // ['foo', 'bar']

// You can specify a custom lines delimiter if necessary:
await $`touch foo bar baz; find ./ -type f -print0`
  .lines('\0')        // ['./bar', './baz', './foo']

// If the output is a valid JSON, parse it in place:
await $`echo '{"foo": "bar"}'`
  .json()             // {foo: 'bar'}
```

## `pid, cwd, cmd, fullCmd`

Process metadata getters.

```js
const p = $`sleep 1`
p.pid       // process id
p.cwd       // process working directory
p.cmd       // command: "sleep 1"
p.fullCmd   // full command with prefix and postfix: "set -euo pipefail;sleep 1"
```

## `[Symbol.asyncIterator]`

Returns an async iterator for the process stdout.

```js
const p = $`echo "Line1\nLine2\nLine3"`
for await (const line of p) {
  console.log(line)
}

// Custom delimiter can be specified:
for await (const line of $({
  delimiter: '\0'
})`touch foo bar baz; find ./ -type f -print0`) {
  console.log(line)
}
```

## `pipe()`

Redirects the output of the process. Almost same as `|` in bash but with enhancements.
```js
const greeting = await $`printf "hello"`
  .pipe($`awk '{printf $1", world!"}'`)
  .pipe($`tr '[a-z]' '[A-Z]'`)
```

`pipe()` accepts any kind `Writable`, `ProcessPromise` or a file path.

```js
await $`echo "Hello, stdout!"`
  .pipe(fs.createWriteStream('/tmp/output.txt'))
```
You can pass a string to `pipe()` to implicitly create a receiving file. The previous example is equivalent to:

```js
await $`echo "Hello, stdout!"`
  .pipe('/tmp/output.txt')
```

Chained streams become _thenables_, so you can `await` them:

```js
const p = $`echo "hello"`
  .pipe(getUpperCaseTransform())
  .pipe(fs.createWriteStream(tempfile()))  // <- stream
const o = await p
```

And the `ProcessPromise` itself is compatible with the standard `Stream.pipe` API:

```js
const { stdout } = await fs
  .createReadStream(await fs.writeFile(file, 'test'))
  .pipe(getUpperCaseTransform())
  .pipe($`cat`)
```

Pipes can be used to show a real-time output of the process:

```js
await $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  .pipe(process.stdout)
```

And the time machine is in stock! You can pipe the process at any phase: on start, in the middle, or even after the end. All chunks will be buffered and processed in the right order.

```js
const result = $`echo 1; sleep 1; echo 2; sleep 1; echo 3`
const piped1 = result.pipe`cat`
let piped2

setTimeout(() => { piped2 = result.pipe`cat` }, 1500)
  
(await piped1).toString()  // '1\n2\n3\n'
(await piped2).toString()  // '1\n2\n3\n'
```

This mechanism allows you to easily split streams to multiple consumers:
```js
const p = $`some-command`
const [o1, o2] = await Process.all([
  p.pipe`log`,
  p.pipe`extract`
])
```

Use combinations of `pipe()` and [`nothrow()`](#nothrow):

```js
await $`find ./examples -type f -print0`
  .pipe($`xargs -0 grep ${'missing' + 'part'}`.nothrow())
  .pipe($`wc -l`)
```

And literals! The `pipe()` does support them too:

```js
await $`printf "hello"`
  .pipe`awk '{printf $1", world!"}'`
  .pipe`tr '[a-z]' '[A-Z]'`
```

The `pipe()` allows not only chain or split stream, but also to merge them.
```js
const $h = $({ halt: true })
const p1 = $`echo foo`
const p2 = $h`echo a && sleep 0.1 && echo c && sleep 0.2 && echo e`
const p3 = $h`sleep 0.05 && echo b && sleep 0.1 && echo d`
const p4 = $`sleep 0.4 && echo bar`
const p5 = $h`cat`

await p1
p1.pipe(p5)
p2.pipe(p5)
p3.pipe(p5)
p4.pipe(p5)

const { stdout } = await p5.run() // 'foo\na\nb\nc\nd\ne\nbar\n'
```

By default, `pipe()` operates with `stdout` stream, but you can specify `stderr` as well:

```js
const p = $`echo foo >&2; echo bar`
const o1 = (await p.pipe.stderr`cat`).toString()  // 'foo\n'
const o2 = (await p.pipe.stdout`cat`).toString()  // 'bar\n'
```

The [signal](/api#signal) option, if specified, will be transmitted through the pipeline.

```js
const ac = new AbortController()
const { signal } = ac
const p = $({ signal, nothrow: true })`echo test`.pipe`sleep 999`
setTimeout(() => ac.abort(), 50)

try {
  await p
} catch ({ message }) {
  message // The operation was aborted
}
```

In short, combine anything you want:

```js
const getUpperCaseTransform = () => new Transform({
  transform(chunk, encoding, callback) {
    callback(null, String(chunk).toUpperCase())
  },
})

// $ > stream (promisified) > $
const o1 = await $`echo "hello"`
  .pipe(getUpperCaseTransform())
  .pipe($`cat`)

o1.stdout //  'HELLO\n'

// stream > $
const file = tempfile()
await fs.writeFile(file, 'test')
const o2 = await fs
  .createReadStream(file)
  .pipe(getUpperCaseTransform())
  .pipe($`cat`)

o2.stdout //  'TEST'
```

## `unpipe()`

Opposite of `pipe()`, it removes the process from the pipeline.

```js
const p1 = $`echo foo && sleep 0.05 && echo bar && sleep 0.05 && echo baz && sleep 0.05 && echo qux`
const p2 = $`echo 1 && sleep 0.05 && echo 2 && sleep 0.05 && echo 3`
const p3 = $`cat`

p1.pipe(p3)
p2.pipe(p3)

setTimeout(() => p1.unpipe(p3), 105)

assert.equal((await p1).stdout, 'foo\nbar\nbaz\nqux')
assert.equal((await p2).stdout, '1\n2\n3')
assert.equal((await p3).stdout, 'foo\n1\nbar\n2\n3')
```

## `kill()`

Kills the process and all children.

By default, signal `SIGTERM` is sent. You can specify a signal via an argument.

```js
const p = $`sleep 999`
setTimeout(() => p.kill('SIGINT'), 100)
await p
```

Killing the expired process raises an error:

```js
const p = await $`sleep 999`
p.kill() // Error: Too late to kill the process.
```

## `abort()`

Terminates the process via an `AbortController` signal.

```js
const ac = new AbortController()
const {signal} = ac
const p = $({signal})`sleep 999`

setTimeout(() => ac.abort('reason'), 100)
await p
```

If `ac` or `signal` is not provided, it will be autocreated and could be used to control external processes.

```js
const p = $`sleep 999`
const {signal} = p

const res = fetch('https://example.com', {signal})
p.abort('reason')
```

The process may be aborted while executing, the method raises an error otherwise:

```js
const p = $({nothrow: true})`sleep 999`
p.abort() // ok

await p
p.abort() // Error: Too late to abort the process.
```

## `stdio()`
Specifies a standard input-output for the process.

```js
const h$ = $({halt: true})
const p1 = h$`read`.stdio('inherit', 'pipe', null).run()
const p2 = h$`read`.stdio('pipe').run() // sets ['pipe', 'pipe', 'pipe']
```

Keep in mind, `stdio` should be set before the process is started, so the preset syntax might be preferable:

```js
await $({stdio: ['pipe', 'pipe', 'pipe']})`read`
```

## `nothrow()`

Changes behavior of `$` to not throw an exception on non-zero exit codes. Equivalent to [`$({nothrow: true})` option](./api#nothrow).

```js
await $`grep something from-file`.nothrow()

// Inside a pipe():
await $`find ./examples -type f -print0`
  .pipe($`xargs -0 grep something`.nothrow())
  .pipe($`wc -l`)

// Accepts a flag to switch nothrow mode for the specific command
$.nothrow = true
await $`echo foo`.nothrow(false)
```

If only the `exitCode` is needed, you can use [`exitCode`](#exitcode) directly:

```js
if (await $`[[ -d path ]]`.exitCode == 0) {
//...
}

// Equivalent of:

if ((await $`[[ -d path ]]`.nothrow()).exitCode == 0) {
//...
}
```

## `quiet()`

Changes behavior of `$` to enable suppress mode.

```js
// Command output will not be displayed.
await $`grep something from-file`.quiet()

$.quiet = true
await $`echo foo`.quiet(false) // Disable for the specific command
```

## `verbose()`

Enables verbose output. Pass `false` to disable.

```js
await $`grep something from-file`.verbose()

$.verbose = true
await $`echo foo`.verbose(false) // Turn off verbose mode once
```

## `timeout()`

Kills the process after a specified period.

```js
await $`sleep 999`.timeout('5s')

// Or with a specific signal.
await $`sleep 999`.timeout('5s', 'SIGKILL')
```

If the process is already settled, the method does nothing. Passing nullish value will disable the timeout.
