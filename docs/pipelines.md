# Pipelines

> You can run this markdown file: 
> 
> ```
> zx docs/pipelines.md
> ```

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
