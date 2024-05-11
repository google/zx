# TypeScript

zx is written in TypeScript and provides the corresponding libdefs out of box. Typings are TS 4+ compatible.

```ts
// script.ts
import { $ } from 'zx'

const list = await $`ls -la`
```

Some runtimes like [Bun](https://bun.sh/) or [Deno](https://deno.com/) have built-in TS support. Node.js requires additional setup. Configure your project according to the [ES modules contract](https://nodejs.org/api/packages.html#packages_type):

- Set [`"type": "module"`](https://nodejs.org/api/packages.html#packages_type)
in **package.json**
- Set [`"module": "ESNext"`](https://www.typescriptlang.org/tsconfig/#module)
in **tsconfig.json**.

Using TypeScript compiler is the most straightforward way.

::: code-group

```bash [tsc]
npm install typescript

tsc script.ts

node script.js
```

```bash [ts-node]
npm install ts-node

ts-node script.ts
# or via node loader
node --loader ts-node/esm script.ts
```

```bash [swc-node]
npm install swc-node

swc-node script.ts
```

```bash [tsx]
npm install tsx

tsx script.ts
```

```bash [bun]
bun script.ts
```

```bash [deno]
deno run --allow-read --allow-sys --allow-env --allow-run script.ts
```

:::
