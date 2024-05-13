# CLI Usage

Zx provides a CLI for running scripts. It is installed with the package and can be used as `zx` executable.

```sh
zx script.mjs
```

## No extensions

If script does not have a file extension (like `.git/hooks/pre-commit`), zx
assumes that it is
an [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
module.

```bash
zx docs/markdown.md
```

## Remote scripts

If the argument to the `zx` executable starts with `https://`, the file will be
downloaded and executed.

```bash
zx https://medv.io/game-of-life.js
```

## Scripts from stdin

The `zx` supports executing scripts from stdin.

```js
zx << 'EOF'
await $`pwd`
EOF
```

## --eval

Evaluate the following argument as a script.

```bash
cat package.json | zx --eval 'const v = JSON.parse(await stdin()).version; echo(v)'
```

## --install

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

## --quiet

Suppress any outputs.

## --verbose

Enable verbose mode.

## --shell

Specify a custom shell binary.

```bash
zx --shell=/bin/bash script.mjs
```

## --prefix & --postfix

Attach a command to the beginning or the end of every command.

```bash
zx --prefix='echo foo;' --postfix='; echo bar' script.mjs
```

## --version

Print the current version of `zx`.

## --help

Print help.

## __filename & __dirname

In [ESM](https://nodejs.org/api/esm.html) modules, Node.js does not provide
`__filename` and `__dirname` globals. As such globals are really handy in scripts,
zx provides these for use in `.mjs` files (when using the `zx` executable).

## require()

In [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
modules, the `require()` function is not defined.
The `zx` provides `require()` function, so it can be used with imports in `.mjs`
files (when using `zx` executable).

```js
const {version} = require('./package.json')
```
