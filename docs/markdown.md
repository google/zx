# Markdown Scripts

Imagine a script with code blocks, formatted comments, schemas, illustrations, etc. [Markdown](https://en.wikipedia.org/wiki/Markdown) is right for this purpose.
Combine `ts`, `js`, `bash` sections to produce a single zx scenario. For example:

````text
# Some script
`ls` — is an unix command to get directory contents. Let's see how to use it in `zx`:

```js
// ts, js, cjs, mjs, etc
const {stdout} = await $`ls -l`
console.log('directory contents:', stdout)
```

This part invokes the same command in a different way:
```bash
# bash syntax
ls -l
```
````

And how it looks like:

> # Some script
> `ls` — is an unix command to get directory contents. Let's see how to use it in `zx`:
> ```js
> // ts, js, cjs, mjs, etc
> const {stdout} = await $`ls -l`
> console.log('directory contents:', stdout)
> ```
>
> This part invokes the same command in a different way:
> ```bash
> # bash syntax
> ls -l
> ```

The rest is simple: just run via `zx` command:
```bash 
zx script.md
```

## Hints
You can use imports here as well:

```js
await import('chalk')
```

`js`, `javascript`, `ts`, `typescript`, `sh`, `shell`, `bash` code blocks will be executed by zx. 

```bash
VAR=$(date)
echo "$VAR" | wc -c
```

Other kinds are ignored:

```css
body .hero {
  margin: 42px;
}
```

The `__filename` will be pointed to **markdown.md**:

```js
console.log(chalk.yellowBright(__filename))
```

