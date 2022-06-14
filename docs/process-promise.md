# ProcessPromise

The `$` returns a `ProcessPromise` instance.

```js
let p = $`command`

await p
```

## `stdin`

Returns a writable stream of the stdin process. Accessing
this getter will trigger execution of a subprocess with [`stdio('pipe')`](#stdio).

Do not forget to end the stream.

```js
let p = $`while read; do echo $REPLY; done`
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
let greeting = await $`printf "hello"`
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
let p = $`sleep 999`
setTimeout(() => p.kill('SIGINT'), 100)
await p
```

## `stdio()`

Specifies a stdio for the process. 

Default is `.stdio('inherit', 'pipe', 'pipe')`.

```js
let p = $`read`.stdio('pipe')
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

Changes behavior of `$` to disable verbose output.

```js
// Command and output will not be displayed.
await $`grep something from-file`.quiet()
```

## `timeout()`

Kills the process after a specified timeout.

```js
await $`sleep 999`.timeout('5s')

// Or with a specific signal.
await $`sleep 999`.timeout('5s', 'SIGKILL')
```
