# Configuration

## `$.shell`

Specifies what shell is used. Default is `which bash`.

```js
$.shell = '/usr/bin/bash'
```

Or use a CLI argument: `--shell=/bin/bash`

## `$.spawn`

Specifies a `spawn` api. Defaults to native `child_process.spawn`.

To override a sync API implementation, set `$.spawnSync` correspondingly.

## `$.kill`
Specifies a `kill` function. The default implements _half-graceful shutdown_ via `ps.tree()`. You can override with more sophisticated logic.

```js
import treekill from 'tree-kill'

$.kill = (pid, signal = 'SIGTERM') => {
  return new Promise((resolve, reject) => {
    treekill(pid, signal, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
```

## `$.prefix`

Specifies the command that will be prefixed to all commands run.

Default is `set -euo pipefail;`.

Or use a CLI argument: `--prefix='set -e;'`

## `$.postfix`

Like a `$.prefix`, but for the end of the command.

```js
$.postfix = '; exit $LastExitCode' // for PowerShell compatibility
```

## `$.preferLocal`

Specifies whether to prefer `node_modules/.bin` located binaries over globally system installed ones.

```js
$.preferLocal = true

await $`c8 npm test`
```

You can also specify a directory to search for local binaries:

```js
$.preferLocal = '/some/to/bin'
$.preferLocal = ['/path/to/bin', '/another/path/bin']
```

## `$.quote`

Specifies a function for escaping special characters during
command substitution.

## `$.verbose`

Specifies verbosity. Default is `false`.

In verbose mode, `zx` prints all executed commands alongside with their
outputs.

Or use the CLI argument: `--verbose` to set `true`.

## `$.quiet`

Suppresses all output. Default is `false`.

Via CLI argument: `--quiet` sets `$.quiet = true`.

## `$.env`

Specifies an environment variables map.

Defaults to `process.env`.

## `$.cwd`

Specifies a current working directory of all processes created with the `$`.

The [cd()](#cd) func changes only `process.cwd()` and if no `$.cwd` specified,
all `$` processes use `process.cwd()` by default (same as `spawn` behavior).

## `$.log`

Specifies a [logging function](src/log.ts).

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

The log mostly acts like a debugger, so by default it uses `process.error` for output.
Override the `$.log.output` to change the stream.

```ts
$.log.output = process.stdout
```

Define `$.log.formatters` to customize each log entry kind printing:

```ts
$.log.formatters = {
  cmd: (entry: LogEntry) => `CMD: ${entry.cmd}`,
  fetch: (entry: LogEntry) => `FETCH: ${entry.url}`
}
```

## `$.timeout`

Specifies a timeout for the command execution.

```js
$.timeout = '1s'
$.timeoutSignal= 'SIGKILL'

await $`sleep 999`
```

## `$.delimiter`
Specifies a delimiter for splitting command output into lines.
Defaults to `\r?\n` (newline or carriage return + newline).

```js
$.delimiter = /\0/        // null character

await $`find ./ -type f -print0 -maxdepth 1`
```

## `$.defaults`

Holds default configuration values. They will be used if the corresponding
`$` options are not specified.

```ts
$.defaults = {
  cwd:            process.cwd(),
  env:            process.env,
  verbose:        false,
  quiet:          false,
  sync:           false,
  shell:          true,
  prefix:         'set -euo pipefail;',   // for bash
  postfix:        '; exit $LastExitCode', // for powershell
  nothrow:        false,
  stdio:          'pipe', // equivalent to ['pipe', 'pipe', 'pipe']
  detached:       false,
  preferLocal:    false,
  spawn:          childProcess.spawn,
  spawnSync:      childProcess.spawnSync,
  log:            $.log,
  kill:           $.kill,
  killSignal:     'SIGTERM',
  timeoutSignal:  'SIGTERM',
  delimiter:      /\r?\n/,
}
```
