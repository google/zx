# Migration from v7 to v8

[v8.0.0 release](https://github.com/google/zx/releases/tag/8.0.0) brought many features, improvements and fixes, but also has introduced a few breaking changes.

1. `$.verbose` is set to `false` by default, but errors are still printed to `stderr`. Set `$.quiet = true` to suppress any output.
```js
$.verbose = true // everything works like in v7

$.quiet = true   // to completely turn off logging
```

2. `ssh` API was dropped. Install [webpod](https://github.com/webpod/webpod) package instead.
```js
// import {ssh} from 'zx' ↓
import {ssh} from 'webpod'

const remote = ssh('user@host')
await remote`echo foo`
```

3. zx is not looking for `PowerShell` anymore, on Windows by default. If you still need it, use the `usePowerShell` helper to enable:

```js
import { usePowerShell, useBash } from 'zx'

usePowerShell() // to enable powershell
useBash()       // switch to bash, the default
```

To look for modern [PowerShell v7+](https://github.com/google/zx/pull/790), invoke `usePwsh()` helper instead:

```js
import { usePwsh } from 'zx'

usePwsh()
```

4. Process cwd synchronization between `$` invocations is now disabled by default. This functionality is provided via an async hook and can now be controlled directly.

```js
import { syncProcessCwd } from 'zx'

syncProcessCwd() // restores legacy v7 behavior
```
