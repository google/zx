# Markdown Scripts

It's possible to write scripts using markdown. Only code blocks will be executed
by zx.

> You can run this markdown file:
>
> ```
> zx docs/markdown.md
> ```

```js
await $`whoami`
await $`echo ${__dirname}`
```

```ts
await $`pwd`
```

The `__filename` will be pointed to **markdown.md**:

```js
console.log(chalk.yellowBright(__filename))
```

We can use imports here as well:

```js
await import('chalk')
```

A bash code (with `bash` or `sh` language tags) also will be executed:

```bash
VAR=$(date)
echo "$VAR" | wc -c
```

Other code blocks are ignored:

```css
body .hero {
  margin: 42px;
}
```
