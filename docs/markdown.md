# Markdown

Imagine a script with code blocks, comments, schemas, illustrations, etc. Markdown is right for this purpose.
Combine `ts`, `js`, `bash` sections to produce a single script. For example:

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
