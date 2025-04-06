<h1><img src="https://google.github.io/zx/img/logo.svg" alt="Zx logo" height="32" valign="middle"> zx</h1>

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

const branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

const name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash is great, but when it comes to writing more complex scripts,
many people prefer a more convenient programming language.
JavaScript is a perfect choice, but the Node.js standard library
requires additional hassle before using. The `zx` package provides
useful cross-platform wrappers around `child_process`, escapes arguments and
gives sensible defaults.

## Install

```bash
npm install zx
```
Complete installation instructions: [zx/setup](https://google.github.io/zx/setup)

## Documentation

Read documentation on [google.github.io/zx](https://google.github.io/zx/).

## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
