# Shell

zx is not aimed to replace the shell, but to provide a more convenient way to use it through JavaScript enhancements. It supplements the shell with a more powerful and expressive language, so some kind of bash/zsh is still required.

zx provides several functions to help with setup:

* [`useBash`](./api#usebash) switches to bash
* [`usePowerShell`](./api#usepowershell) - PowerShell
* [`usePwsh`](./api#usepwsh) - pwsh (PowerShell v7+)

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
