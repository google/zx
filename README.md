<a href="https://webpod.dev/?from=zx"><img src="https://webpod.dev/img/banner.png" alt="Webpod - deploy JavaScript apps" width="190" align="right"></a>

# 🐚 zx

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

let branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

let name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash is great, but when it comes to writing more complex scripts,
many people prefer a more convenient programming language.
JavaScript is a perfect choice, but the Node.js standard library
requires additional hassle before using. The `zx` package provides
useful wrappers around `child_process`, escapes arguments and
gives sensible defaults.

## Install

```bash
npm install zx
```

## Documentation

Read documentation on [google.github.io/zx](https://google.github.io/zx/).

## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
