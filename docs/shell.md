# Shell

[Bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) is a fundamental part of the Unix ecosystem, and it is widely used for scripting and automation tasks. It provides a powerful set of built-in utils, operators, process controllers.
Bash gives an efficient way to fine-tune the behavior: cmd aliases, context presets, custom functions, env injections, and more.

zx is not trying to replace bash, but to enhance it with JavaScript's capabilities:
* Parallel execution
* Data transformations
* Exception handling
* Conditional logic and loops

```js
#!/usr/bin/env zx
import { $ } from 'zx'

$.nothrow = true

const repos = ['zx', 'webpod']
const clones = repos
  .map(n => $`git clone https://github.com/google/${n} ${n}-clone`)

const results = await Promise.all(clones)
const errors = results.filter(o => !o.ok).map(o => o.stderr.trim())
console.log('errors', errors.join('\n'))

for (p of clones) {
  await p.pipe`cat > ${p.pid}.txt`
}
```

## Bash and Pwsh
There're many shell implementations. zx brings a few setup helpers:

* [`useBash`](./api#usebash) switches to bash
* [`usePowerShell`](./api#usepowershell) — PowerShell
* [`usePwsh`](./api#usepwsh) — pwsh (PowerShell v7+)

You can also set the shell directly via [JS API](./setup#bash), [CLI flags](./cli#shell) or [envars](./cli#environment-variables):

```js
$.shell = '/bin/zsh'
```

```bash
zx --shell /bin/zsh script.js
```

```bash
ZX_SHELL=/bin/zsh zx script.js
```

## zx = bash + js
No compromise, take the best of both.
