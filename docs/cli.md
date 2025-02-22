# CLI Usage

Zx provides a CLI for running scripts. It is installed with the package and can be used as `zx` executable.

```sh
zx script.mjs
```

## No extensions

If script does not have a file extension (like `.git/hooks/pre-commit`), zx
assumes that it is
an [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
module unless the `--ext` option is specified.

## Non-standard extension
`zx` internally loads scripts via `import` API, so you can use any extension supported by the runtime (nodejs, deno, bun) or apply a [custom loader](https://nodejs.org/api/cli.html#--experimental-loadermodule).
However, if the script has a non-js-like extension (`/^\.[mc]?[jt]sx?$/`) and the `--ext` is specified, it will be used.

```bash
zx script.zx           # Unknown file extension "\.zx"
zx --ext=mjs script.zx # OK
```

## Markdown
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

## `--eval`

Evaluate the following argument as a script.

```bash
cat package.json | zx --eval 'const v = JSON.parse(await stdin()).version; echo(v)'
```

## `--repl`
Starts zx in [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) mode.

## `--install`

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

## `--registry`

By default, `zx` uses `https://registry.npmjs.org` as a registry. Customize if needed.

```bash
zx --registry=https://registry.yarnpkg.com script.mjs
```

## `--quiet`

Suppress any outputs.

## `--verbose`

Enable verbose mode.

## `--shell`

Specify a custom shell binary path. By default, zx refers to `bash`.

```bash
zx --shell=/bin/another/sh script.mjs
```

## `--prefer-local, -l`

Prefer locally installed packages bins.

```bash
zx --shell=/bin/bash script.mjs
```

## `--prefix & --postfix`

Attach a command to the beginning or the end of every command.

```bash
zx --prefix='echo foo;' --postfix='; echo bar' script.mjs
```

## `--cwd`

Set the current working directory.

```bash
zx --cwd=/foo/bar script.mjs
```

## `--env`
Specify an env file.

```bash
zx --env=/path/to/some.env script.mjs
```

When `cwd` option is specified, it will be used as base path:  
`--cwd='/foo/bar' --env='../.env'` → `/foo/.env`

## `--ext`

Overrides the default script extension (`.mjs`).

## `--version, -v`

Print the current `zx` version.

## `--help, -h`

Print help notes.

## Environment variables
All the previously mentioned options can be set via the corresponding `ZX_`-prefixed environment variables.

```bash
ZX_VERBOSE=true ZX_SHELL='/bin/bash' zx script.mjs
```
    
```yaml
steps:
  - name: Run script
    run: zx script.mjs
    env:
      ZX_VERBOSE: true
      ZX_SHELL: '/bin/bash'
```

## `__filename & __dirname`

In [ESM](https://nodejs.org/api/esm.html) modules, Node.js does not provide
`__filename` and `__dirname` globals. As such globals are really handy in scripts,
zx provides these for use in `.mjs` files (when using the `zx` executable).

## `require()`

In [ESM](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
modules, the `require()` function is not defined.
The `zx` provides `require()` function, so it can be used with imports in `.mjs`
files (when using `zx` executable).

```js
const {version} = require('./package.json')
```
