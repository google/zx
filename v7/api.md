::: warning
This is documentation for zx v7, which is no longer actively maintained.

For up-to-date documentation, see the [latest version](/api) (v8).
:::

# API Reference

## cd()

Changes the current working directory.

```js
cd('/tmp')
await $`pwd` // => /tmp
```

Like `echo`, in addition to `string` arguments, `cd` accepts and trims
trailing newlines from `ProcessOutput` enabling common idioms like:

```js
cd(await $`mktemp -d`)
```

## fetch()

A wrapper around the [node-fetch](https://www.npmjs.com/package/node-fetch)
package.

```js
const resp = await fetch('https://medv.io')
```

## question()

A wrapper around the [readline](https://nodejs.org/api/readline.html) package.

```js
const bear = await question('What kind of bear is best? ')
```

## sleep()

A wrapper around the `setTimeout` function.

```js
await sleep(1000)
```

## echo()

A `console.log()` alternative which can take [ProcessOutput](#processoutput).

```js
const branch = await $`git branch --show-current`

echo`Current branch is ${branch}.`
// or
echo('Current branch is', branch)
```

## stdin()

Returns the stdin as a string.

```js
const content = JSON.parse(await stdin())
```

## within()

Creates a new async context.

```js
await $`pwd` // => /home/path

within(async () => {
  cd('/tmp')

  setTimeout(async () => {
    await $`pwd` // => /tmp
  }, 1000)
})

await $`pwd` // => /home/path
```

```js
await $`node --version` // => v20.2.0

const version = await within(async () => {
  $.prefix += 'export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh; nvm use 16;'

  return $`node --version`
})

echo(version) // => v16.20.0
```

## retry()

Retries a callback for a few times. Will return after the first
successful attempt, or will throw after specifies attempts count.

```js
const p = await retry(10, () => $`curl https://medv.io`)

// With a specified delay between attempts.
const p = await retry(20, '1s', () => $`curl https://medv.io`)

// With an exponential backoff.
const p = await retry(30, expBackoff(), () => $`curl https://medv.io`)
```

## spinner()

Starts a simple CLI spinner.

```js
await spinner(() => $`long-running command`)

// With a message.
await spinner('working...', () => $`sleep 99`)
```

## glob()

The [globby](https://github.com/sindresorhus/globby) package.

```js
const packages = await glob(['package.json', 'packages/*/package.json'])
```

## which()

The [which](https://github.com/npm/node-which) package.

```js
const node = await which('node')
```

## argv

The [minimist](https://www.npmjs.com/package/minimist) package.

A minimist-parsed version of the `process.argv` as `argv`.

```js
if (argv.someFlag) {
  echo('yes')
}
```

Use minimist options to customize the parsing:

```js
const myCustomArgv = minimist(process.argv.slice(2), {
  boolean: [
    'force',
    'help',
  ],
  alias: {
    h: 'help',
  },
})
```

## chalk

The [chalk](https://www.npmjs.com/package/chalk) package.

```js
console.log(chalk.blue('Hello world!'))
```

## fs

The [fs-extra](https://www.npmjs.com/package/fs-extra) package.

```js
const {version} = await fs.readJson('./package.json')
```

## os

The [os](https://nodejs.org/api/os.html) package.

```js
await $`cd ${os.homedir()} && mkdir example`
```

## path

The [path](https://nodejs.org/api/path.html) package.

```js
await $`mkdir ${path.join(basedir, 'output')}`
```

## yaml

The [yaml](https://www.npmjs.com/package/yaml) package.

```js
console.log(YAML.parse('foo: bar').foo)
```
