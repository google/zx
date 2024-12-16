# Process Promise

The `$` returns a `ProcessPromise` instance. When resolved, it becomes a [`ProcessOutput`](./process-output.md).

```js
const p = $`command` // ProcessPromise

const o = await p    // ProcessOutput
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
...
}
```

## `json(), text(), lines(), buffer(), blob()`

Output formatters collection.

```js
const p = $`echo 'foo\nbar'`

await p.text()        // foo\n\bar\n
await p.text('hex')   //  666f6f0a0861720a
await p.buffer()      //  Buffer.from('foo\n\bar\n')
await p.lines()       // ['foo', 'bar']
await $`echo '{"foo": "bar"}'`.json() // {foo: 'bar'}
```


## `pipe()`

Redirects the stdout of the process.

```js
await $`echo "Hello, stdout!"`
  .pipe(fs.createWriteStream('/tmp/output.txt'))

await $`cat /tmp/output.txt`
```

Pipes can be used to show a real-time output of the process:

```js
await $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  .pipe(process.stdout)
```

The `pipe()` method can combine `$` processes. Same as `|` in bash:

```js
const greeting = await $`printf "hello"`
  .pipe($`awk '{printf $1", world!"}'`)
  .pipe($`tr '[a-z]' '[A-Z]'`)

echo(greeting)
```

Use combinations of `pipe()` and [`nothrow()`](#nothrow):

```js
await $`find ./examples -type f -print0`
  .pipe($`xargs -0 grep ${'missing' + 'part'}`.nothrow())
  .pipe($`wc -l`)
```

## `kill()`

Kills the process and all children.

By default, signal `SIGTERM` is sent. You can specify a signal via an argument.

```js
const p = $`sleep 999`
setTimeout(() => p.kill('SIGINT'), 100)
await p
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

## `stdio()`

Specifies a stdio for the process.

Default is `.stdio('inherit', 'pipe', 'pipe')`.

```js
const p = $`read`.stdio('pipe')
```

## `nothrow()`

Changes behavior of `$` to not throw an exception on non-zero exit codes.

```js
await $`grep something from-file`.nothrow()

// Inside a pipe():

await $`find ./examples -type f -print0`
  .pipe($`xargs -0 grep something`.nothrow())
  .pipe($`wc -l`)
```

If only the `exitCode` is needed, you can use [`exitCode`](#exitcode) directly:

```js
if (await $`[[ -d path ]]`.exitCode == 0) {
...
}

// Equivalent of:

if ((await $`[[ -d path ]]`.nothrow()).exitCode == 0) {
...
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

Kills the process after a specified timeout.

```js
await $`sleep 999`.timeout('5s')

// Or with a specific signal.
await $`sleep 999`.timeout('5s', 'SIGKILL')
```
