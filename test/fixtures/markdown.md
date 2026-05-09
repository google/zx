# Markdown

ignore

>
> ```
> echo ignore
> ```

```js
await $`whoami`
await $`echo ${__dirname}`
```

~~~js
await $`echo "tilde"`
~~~

```js
console.log(chalk.yellowBright(__filename))
```

```js
await import('chalk')
```

```bash
VAR=$(echo hello)
echo "$VAR"
```

    // ignore
    console.log('world')

Other code blocks are ignored:

```css
.ignore {}
```
