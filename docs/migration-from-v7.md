# Migration from v7 to v8

[v8.0.0 release](https://github.com/google/zx/releases/tag/8.0.0) brought many features, improvements, optimizations and fixes, but also has introduced a few breaking changes. Fortunately, everything can be restored and legacy v7 scripts can still run with minor configurations.

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

# 🚀
Keep in mind, v7 is in maintenance mode, so it will not receive any new enhancements. We encourage you to upgrade to the latest: it's [16x smaller](https://dev.to/antongolub/how-and-why-do-we-bundle-zx-1ca6), faster, safer, more reliable and useful in a [wider range of practical scenarios](https://github.com/google/zx/releases).
