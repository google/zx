<h1><img src="https://google.github.io/zx/img/logo.svg" alt="Zx logo" height="32" valign="middle"> zx</h1>

```js
#!/usr/bin/env zx

// Get the project name from the package.json file
await $`cat package.json | grep name`

// Get the current Git branch and store it in the 'branch' variable
let branch = await $`git branch --show-current`

// Deploy the project using 'dep' and the obtained Git branch
await $`dep deploy --branch=${branch}`

// Run three asynchronous shell commands in parallel
await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

// Define a variable 'name' with the value "foo bar"
let name = 'foo bar'

// Create a directory with the name stored in the 'name' variable under /tmp
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
