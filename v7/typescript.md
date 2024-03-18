::: warning
This is documentation for zx v7, which is no longer actively maintained.

For up-to-date documentation, see the [latest version](/api) (v8).
:::

# TypeScript

Configure your project to use [ES modules](https://nodejs.org/api/packages.html#packages_type):

- Set [`"type": "module"`](https://nodejs.org/api/packages.html#packages_type)
in **package.json**
- Set [`"module": "ESNext"`](https://www.typescriptlang.org/tsconfig/#module)
in **tsconfig.json**.

It is possible to make use of `$` and other functions via explicit imports:

```ts
import { $ } from 'zx'
```

Or import globals explicitly:

```ts
import 'zx/globals'
```

Wrap your code in an async function and call it immediately:

```ts
void async function () {
  await $`ls -la`
}()
```
