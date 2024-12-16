# Quotes

Bash supports various ways to quote arguments: single quotes, double quotes, and a bash-specific method using C-style
quotes `$'...'`. Zx prefers the latter approach.

```js
const name = 'foo & bar'
await $`mkdir ${name}`
```

Zx automatically escapes and quotes anything within `${...}`, so there's no need for additional quotes.

The following examples produce the same, correct result:

```js
await $`mkdir ${'path/to-dir/' + name}`
```

```js
await $`mkdir path/to-dir/${name}`
```

Keep in mind, that `PowerShell` or `pwsh` requires a corresponding quote implementation. Define it [via helpers](./setup#bash) or manually:

```js
import { quotePowerShell } from 'zx'

$.quote = quotePowerShell
```

## Array of arguments

Zx can also accept an array of arguments within `${...}`. Each array item will be quoted separately and then joined by a
space.

```js
const flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

## Glob patterns

Because Zx escapes everything inside `${...}`, you can't use glob syntax directly. Instead, Zx provides 
a [`glob`](api.md#glob) function.

The following example won't work:

```js
const files = './**/*.md' // [!code error] // Incorrect
await $`ls ${files}`
```

The correct approach:

```js
const files = await glob('./**/*.md')
await $`ls ${files}`
```

## Home dir `~`

Zx won't expand the home directory symbol `~` if it's within `${...}`. Use `os.homedir()` for that purpose.

```js
const dir = `~/Downloads` // [!code error] // Incorrect
await $`ls ${dir}`
```

```js
await $`ls ${os.homedir()}/Downloads` // Correct
```

```js
await $`ls ~/Downloads` // Correct, ~ is outside of ${...}
```

## Assembling commands

If you're trying to dynamically assemble commands in Zx, you might run into limitations. For instance, the following
approach won't work:

```js
const cmd = 'rm'
if (force) cmd += ' -f'
if (recursive) cmd += ' -r'
cmd += ' ' + file

await $`${cmd}` // [!code error] // Incorrect
```

Zx will escape the entire string, making the command invalid. Instead, assemble an array of arguments and pass it to Zx
like this:

```js
const args = []
if (force) args.push('-f')
if (recursive) args.push('-r')
args.push(file)

await $`rm ${args}` // [!code hl]
```
