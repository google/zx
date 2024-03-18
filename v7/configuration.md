::: warning
This is documentation for zx v7, which is no longer actively maintained.

For up-to-date documentation, see the [latest version](/api) (v8).
:::

# Configuration

## $.shell

Specifies what shell is used. Default is `which bash`.

```js
$.shell = '/usr/bin/bash'
```

Or use a CLI argument: `--shell=/bin/bash`

## $.spawn

Specifies a `spawn` api. Defaults to `require('child_process').spawn`.

## $.prefix

Specifies the command that will be prefixed to all commands run.

Default is `set -euo pipefail;`.

Or use a CLI argument: `--prefix='set -e;'`

## $.quote

Specifies a function for escaping special characters during
command substitution.

## $.verbose

Specifies verbosity. Default is `true`.

In verbose mode, `zx` prints all executed commands alongside with their
outputs.

Or use the CLI argument `--quiet` to set `$.verbose = false`.

## $.env

Specifies an environment variables map.

Defaults to `process.env`.

## $.cwd

Specifies a current working directory of all processes created with the `$`.

The [cd()](#cd) func changes only `process.cwd()` and if no `$.cwd` specified,
all `$` processes use `process.cwd()` by default (same as `spawn` behavior).

## $.log

Specifies a [logging function](src/core.ts).

```ts
import {LogEntry, log} from 'zx/core'

$.log = (entry: LogEntry) => {
  switch (entry.kind) {
    case 'cmd':
      // for example, apply custom data masker for cmd printing
      process.stderr.write(masker(entry.cmd))
      break
    default:
      log(entry)
  }
}
```
