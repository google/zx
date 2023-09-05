# CLI Usage

Zx provides a CLI for running scripts. It is installed with the package and can be used as `zx` executable.

```sh
zx script.mjs
```

## Scripts without extensions

If script does not have a file extension (like `.git/hooks/pre-commit`), zx
assumes that it is
an [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
module.

```bash
zx docs/markdown.md
```

## Executing remote scripts

If the argument to the `zx` executable starts with `https://`, the file will be
downloaded and executed.

```bash
zx https://medv.io/game-of-life.js
```

## Executing scripts from stdin

The `zx` supports executing scripts from stdin.

```js
zx << 'EOF'
await $`pwd`
EOF
```

## Executing scripts via --eval

Evaluate the following argument as a script.

```bash
cat package.json | zx --eval 'let v = JSON.parse(await stdin()).version; echo(v)'
```

## Installing dependencies via --install

```js
// script.mjs:
import sh from 'tinysh'

sh.say('Hello, world!')
```

Add `--install` flag to the `zx` command to install missing dependencies
automatically.

```bash
zx --install script.mjs
```

You can also specify needed version by adding comment with `@` after
the import.

```js
import sh from 'tinysh' // @^1
```

## Executing commands on remote hosts

The `zx` uses [webpod](https://github.com/webpod/webpod) to execute commands on
remote hosts.

```js
import {ssh} from 'zx'

await ssh('user@host')`echo Hello, world!`
```

## `__filename` and `__dirname`

In [ESM](https://nodejs.org/api/esm.html) modules, Node.js does not provide
`__filename` and `__dirname` globals. As such globals are really handy in scripts,
zx provides these for use in `.mjs` files (when using the `zx` executable).

## require()

In [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
modules, the `require()` function is not defined.
The `zx` provides `require()` function, so it can be used with imports in `.mjs`
files (when using `zx` executable).

```js
let {version} = require('./package.json')
```
