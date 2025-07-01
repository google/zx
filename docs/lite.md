# zx@lite

Just core functions without extras:
* ~7x smaller than the full version
* No CLI, no docs, no manpage assets embedded
* Same package name, but different publish channel — `@lite`
* Less code — ~~less risks~~ faster and more reliable ISEC audit
* Recommended for custom toolkits based on zx

```sh
npm i zx@lite
npm i zx@8.5.5-lite
```
Detailed comparison: [versions](./versions)

```js
import { $ } from 'zx'
await $`echo foo`
```

### Range of choice
**tool size ← [`child_process`](https://nodejs.org/api/child_process.html) [`zurk`](https://github.com/webpod/zurk) `zx@lite` `zx`  → built-in functionality** 
