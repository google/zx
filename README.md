# 🐚 zx

> [!TIP]
> **zx@7** is no longer actively maintained. Critical bug fixes and vulnerability fixes only considered.
>
> Check this out: [**zx@8**](https://github.com/google/zx/releases/tag/8.0.0) is a giant leap forward. [There are a lot](https://github.com/google/zx/releases) of cool features, improvements, compatibility enhancements 🚀
> Please follow the [migration guide](https://google.github.io/zx/migration-from-v7) to upgrade to the latest. If something doesn't work, feel free to start a new [issue](https://github.com/google/zx/issues) or [discussion](https://github.com/google/zx/discussions).

[![npm](https://img.shields.io/npm/v/zx.svg)](https://www.npmjs.com/package/zx)
[![npm](https://img.shields.io/npm/dm/zx.svg)](https://www.npmjs.com/package/zx)

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
**Requirement**: Node.js >= 16.0.0

## Documentation

Read the documentation on [google.github.io/zx](https://google.github.io/zx/).

## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
