::: warning
This is documentation for zx v7, which is no longer actively maintained.

For up-to-date documentation, see the [latest version](/api) (v8).
:::

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

## Canary / Beta / RC builds

Impatient early adopters can try the experimental zx versions.
But keep in mind: these builds are ⚠️️__beta__ in every sense.

```bash
npm i zx@dev
npx zx@dev --install --quiet <<< 'import _ from "lodash" /* 4.17.15 */; console.log(_.VERSION)'
```
