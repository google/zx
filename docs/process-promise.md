# ProcessPromise

## `pipe()`

The `zx` supports Node.js streams and special `pipe()` method can be used to
redirect stdout.

```js
await $`echo "Hello, stdout!"`
  .pipe(fs.createWriteStream('/tmp/output.txt'))

await $`cat /tmp/output.txt`
```

Processes created with `$` gets stdin from `process.stdin`, but we can also
write to child process too:

```js
let p = $`read var; echo "$var";`
p.stdin.write('Hello, stdin!\n')

let {stdout} = await p
```

Pipes can be used to show real-time output of programs:

```js
$.verbose = false

await $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  .pipe(process.stdout)
```

Pipe both stdout and stderr:

```js
let echo = $`echo stdout; echo stderr 1>&2`
echo.stdout.pipe(process.stdout)
echo.stderr.pipe(process.stdout)
await echo
```

Also, the `pipe()` method can combine `$` programs. Same as `|` in bash:

```js
let greeting = await $`printf "hello"`
  .pipe($`awk '{printf $1", world!"}'`)
  .pipe($`tr '[a-z]' '[A-Z]'`)

console.log(greeting.stdout)
```

Use combinations of `pipe()` and [`nothrow()`](https://github.com/google/zx#nothrow):

```js
await $`find ./examples -type f -print0`
  .pipe(nothrow($`xargs -0 grep ${'missing' + 'part'}`))
  .pipe($`wc -l`)
```

## `nothrow()`

Changes behavior of `$` to not throw an exception on non-zero exit codes.

```ts
function nothrow<P>(p: P): P
```

Usage:

```js
await nothrow($`grep something from-file`)

// Inside a pipe():

await $`find ./examples -type f -print0`
  .pipe(nothrow($`xargs -0 grep something`))
  .pipe($`wc -l`)
```

If only the `exitCode` is needed, you can use the next code instead:

```js
if (await $`[[ -d path ]]`.exitCode == 0) {
  ...
}

// Equivalent of:

if ((await nothrow($`[[ -d path ]]`)).exitCode == 0) {
  ...
}
```

## `withTimeout()`

Runs and sets a timeout for a cmd.

```js
import {withTimeout} from 'zx/experimental'

await withTimeout(100, 'SIGTERM')`sleep 9999`
```
