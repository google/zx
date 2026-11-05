# Nix

[Nix](https://nix.dev/) can provide zx and its dependencies when you run a script, without installing zx globally with npm. You need a Nix installation with `nix-shell` available and a configured `nixpkgs` search path.

## Run a script with nix-shell

Save this example as `hello.mjs`:

```js
#!/usr/bin/env nix-shell
/*
#! nix-shell -i zx --packages zx
*/

const message = await $`printf '%s\n' 'Hello from Nix and zx'`
console.log(message.stdout.trim())
```

Make it executable and run it:

```bash
chmod +x hello.mjs
./hello.mjs
```

The first line asks the operating system to start `nix-shell`. The `#! nix-shell` directive selects zx as the interpreter and requests the `zx` package from Nixpkgs. Nix supplies the package and then passes the script to zx.

## Why the block comment is needed

Node.js accepts a hashbang only at the start of a JavaScript file. When zx passes the script to Node.js, a second `#! nix-shell` directive outside a comment causes a `SyntaxError`.

The `/* ... */` block lets both tools read the same script: `nix-shell` still finds the interpreter directive, while Node.js treats that line as a JavaScript comment and can parse the rest of the file. As described in the [nix-shell manual](https://nix.dev/manual/nix/stable/command-ref/nix-shell.html#use-as-a--interpreter), these additional directives do not have to be at the beginning of the file.

If zx is already installed, `zx hello.mjs` also runs the JavaScript. This bypasses `nix-shell`, so it does not acquire the packages declared in the comment.
