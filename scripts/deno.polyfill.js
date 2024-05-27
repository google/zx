import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __filename = new URL(import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

if (globalThis.Deno) {
  globalThis.require = require
  globalThis.__filename = __filename
  globalThis.__dirname = __dirname
}

export { require, __dirname, __filename }
