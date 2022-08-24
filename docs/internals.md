# Internals

The hidden parts of zx superpowers.

> ## ⚠️️ Warning
> Unstable by design.  
> No backward compatibility.  
> Not recommended for regular usage.

### `importDeps()`

Fetches the required deps from the registry.

```js
import { importDeps } from 'zx/internals'
await importDeps({lodash: '4.17.21'})

const lodash = require('lodash')
lodash.VERSION // 4.17.21

const { cpy: {default: cpy}, lodash } = await importDeps({ cpy: '9.0.1', lodash: '4.17.21' }, {registry: 'https://registry.yarnpkg.com/', userconfig: '/path/to/.npmrc'})
await cpy([
  'source/*.png',
  '!source/cat.png',
], 'dst')

lodash.size({ 'a': 1, 'b': 2 }) // 2
```

### `parseDeps()`

Extracts deps from the scripts contents.

```js
import { parseDeps } from 'zx/internals'

const contents = `
import fs from 'fs'
import path from 'path'
import foo from "foo"

const cpy = await import('cpy')
const { pick } = require('lodash')
`

parseDeps(contents) //  { foo: 'latest', cpy: 'latest', lodash: 'latest' }
```
