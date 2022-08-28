# Quotes

When passing arguments to `${...}` there is no need to add quotes. **Quotes will 
be added automatically if needed.**

```js
let name = 'foo & bar'
await $`mkdir ${name}`
```

For quotes **zx** uses special bash syntax (next commands are valid bash):

```bash
mkdir $'foo & bar'
$'ls' $'-la'
```

If you add quotes `"${name}"`, it will produce a wrong command. 

If you need to add something extra, consider putting it inside curly brackets.

```js
await $`mkdir ${'path/to-dir/' + name}`
```

This will also work properly:

```js
await $`mkdir path/to-dir/${name}`
```

### Array of arguments

The `zx` can also take an array or arguments in the `${...}`. Items of the array
will be quoted separately and concatenated via a space. 

Do **not** add a `.join(' ')`.

```js
let flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

If you already have a string with arrays, it's your responsibility
to correctly parse it and distinguish separate arguments. For example like this:

```js
await $`git log ${'--oneline --decorate --color'.split(' ')}`
```

### globbing and `~`

As everything passed through `${...}` will be escaped, you can't use `~` or glob
syntax. 

In order for this to work the zx provides 
[globby package](../README.md#globby-package).

For instead of this:

```js
let files = '~/dev/**/*.md' // wrong
await $`ls ${files}`
```

Use `glob` function and `os` package:

```js
let files = await glob(os.homedir() + '/dev/**/*.md')
await $`ls ${files}`
```
