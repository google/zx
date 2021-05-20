# Markdown Scripts

It's possible to write scripts using markdown. Only code blocks will be executed
by zx. Try to run `zx examples/index.md`.

```js
await $`whoami`
await $`ls -la ${__dirname}`
```

The `__filename` will be pointed to **index.md**:

```js
console.log(chalk.yellowBright(__filename))
```

We can use imports here as well:

```js
await import('./basics.mjs')
```
