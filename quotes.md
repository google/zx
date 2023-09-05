# Quotes

Bash has a few ways to quote arguments. Single quotes, double quotes and bash-only,
C-style quotes `$'...'`. Zx uses the last one.

```js
const name = 'foo & bar'
await $`mkdir ${name}`
```

Everything inside `${...}` will be escaped and quoted properly.
**No need to add extra quotes.**

Next examples are equivalent:

```js
await $`mkdir ${'path/to-dir/' + name}`
```

```js
await $`mkdir path/to-dir/${name}`
```

## Array of arguments

The `zx` can also take an array or arguments in the `${...}`. Items of the array
will be quoted separately and concatenated via a space.

```js
const flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

## Globbing

As everything passed through `${...}` will be escaped, you can't use glob syntax.
In order for this to work the zx provides [glob](api.md#glob) function.

Next example will not work:

```js
const files = './**/*.md' // wrong
await $`ls ${files}`
```

Correct way:

```js
const files = await glob('./**/*.md')
await $`ls ${files}`
```

## Home dir `~`

Same with home dir `~`. It will not be expanded inside `${...}`. Use `os.homedir()` instead.

```js
await $`ls ~/Downloads` // correct. ~ is not inside ${...}
```

```js
const dir = `~/Downloads` // wrong
await $`ls ${dir}`
```

```js
await $`ls ${os.homedir()}/Downloads` // correct
```

## Assembling commands

You may find what zx is not suitable for assembling commands. For example, you can't
do this:

```js
const cmd = 'rm'
if (force) cmd += ' -f'
if (recursive) cmd += ' -r'
cmd += ' ' + file

await $`${cmd}`
```

This will not work because zx will escape the whole string, and you will end up with
`rm\ -f\ -r\ file`. Instead, you can pass an [array of arguments](#array-of-arguments):

```js
const args = []
if (force) args.push('-f')
if (recursive) args.push('-r')
args.push(file)

await $`rm ${args}`
```


