# Configuration

## `$.shell`

Specifies what shell is used. Default is `which bash`.

```js
$.shell = '/usr/bin/bash'
```

Or use a CLI argument: `--shell=/bin/bash`

## `$.spawn`

Specifies a `spawn` api. Defaults to `require('child_process').spawn`.

To override a sync API implementation, set `$.spawnSync` correspondingly.

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

## `$.timeout`

Specifies a timeout for the command execution.

```js
$.timeout = '1s'
$.timeoutSignal= 'SIGKILL'

await $`sleep 999`
```

## `$.defaults`

Holds the default configuration values. They will be used if the corresponding
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
  killSignal:     'SIGTERM',
  timeoutSignal:  'SIGTERM'
}
```
