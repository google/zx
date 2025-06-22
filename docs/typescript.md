# TypeScript

zx is written in TypeScript and provides the corresponding libdefs out of the box. Types are TS 4+ compatible. Write code in any suitable format `.ts`, `.mts`, `.cts` or add [a custom loader](./cli#non-standard-extension).

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

Using TypeScript compiler is the most straightforward way, but native TS support from runtimes is gradually increasing.

::: code-group

```bash [node]
# Since Node.js v22.6.0
node --experimental-strip-types script.js
```

```bash [npx]
# Since Node.js v22.6.0
NODE_OPTIONS="--experimental-strip-types" zx script.js
```

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
# or
node --import=tsx script.ts
```

```bash [bun]
bun script.ts
```

```bash [deno]
deno run --allow-read --allow-sys --allow-env --allow-run script.ts
```

:::
