import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __filename = new URL(import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

// prettier-ignore
if (globalThis.Deno) {
  globalThis.require = require
  globalThis.__filename = __filename
  globalThis.__dirname = __dirname
  globalThis.module = new Proxy({}, { set() { return true } })
  globalThis.process = {
    env: globalThis.Deno.env.toObject(),
    argv: [globalThis.Deno.execPath(), globalThis.Deno.mainModule.replace('file://', ''), ...globalThis.Deno.args]
  }
}

export { require, __dirname, __filename }
