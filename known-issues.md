# Known Issues

## Output gets truncated

This is a known issue with `console.log()` (see [nodejs/node#6379](https://github.com/nodejs/node/issues/6379)).
It's caused by different behaviour of `console.log()` writing to the terminal vs
to a file. If a process calls `process.exit()`, buffered output will be truncated.
To prevent this, the process should use `process.exitCode = 1` and wait for the
process to exit itself. Or use something like [exit](https://www.npmjs.com/package/exit) package.

Workaround is to write to a temp file:
```js
const tmp = await $`mktemp` // Creates a temp file.
const {stdout} = await $`cmd > ${tmp}; cat ${tmp}`
```

## Colors in subprocess

You may see what tools invoked with `await $` don't show colors, compared to
what you see in a terminal. This is because, the subprocess does not think it's
a TTY and the subprocess turns off colors. Usually there is a way force
the subprocess to add colors.

```js
process.env.FORCE_COLOR='1'
await $`cmd`
```
