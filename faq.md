# FAQ

## Passing env variables

```js
process.env.FOO = 'bar'
await $`echo $FOO`
```

## Passing array of values

When passing an array of values as an argument to `$`, items of the array will
be escaped
individually and concatenated via space.

Example:

```js
const files = [...]
await $`tar cz ${files}`
```

## Importing into other scripts

It is possible to make use of `$` and other functions via explicit imports:

```js
#!/usr/bin/env node
import {$} from 'zx'

await $`date`
```

## Attaching a profile

By default `child_process` does not include aliases and bash functions.
But you are still able to do it by hand. Just attach necessary directives
to the `$.prefix`.

```js
$.prefix += 'export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh; '
await $`nvm -v`
```

## Using GitHub Actions

The default GitHub Action runner comes with `npx` installed.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build
        env:
          FORCE_COLOR: 3
        run: |
          npx zx <<'EOF'
          await $`...`
          EOF
```

## Verbose and Quiet
zx has internal logger, which captures events if a condition is met:

| Event  | Verbose | Quiet   | Description                  |
|--------|---------|---------|------------------------------|
| stdout | `true`  | `false` | Spawned process stdout       |
| stderr | `any`   | `false` | Process stderr data          |
| cmd    | `true`  | `false` | Command execution            |
| fetch  | `true`  | `false` | Fetch resources by http(s)   |
| cd     | `true`  | `false` | Change directory             |
| retry  | `true`  | `false` | Capture exec error           |
| custom | `true`  | `false` | User-defined event           |

By default, both `$.verbose` and `$.quiet` options are `false`, so only `stderr` events are written. Any output goes to the `process.stderr` stream.

You may control this flow globally or in-place
```js
// Global debug mode on
$.verbose = true
await $`echo hello`

// Suppress the particular command
await $`echo fobar`.quiet()

// Suppress everything
$.quiet = true
await $`echo world`

// Turn on in-place debug
await $`echo foo`.verbose()
```

You can also override the default logger with your own:
```js
// globally
$.log = (entry) => {
  switch (entry.kind) {
    case 'cmd':
      console.log('Command:', entry.cmd)
      break
    default:
      console.warn(entry)
  }
}
// or in-place
$({log: () => {}})`echo hello`
```

## Canary / Beta / RC builds

Impatient early adopters can try the experimental zx versions.
But keep in mind: these builds are ⚠️️__beta__ in every sense.

```bash
npm i zx@dev
npx zx@dev --install --quiet <<< 'import _ from "lodash" /* 4.17.15 */; console.log(_.VERSION)'
```
