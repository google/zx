import { createRequire } from 'node:module'

if (globalThis.Deno) {
  globalThis.require = createRequire(import.meta.url)
  globalThis.__filename = new URL(import.meta.url).pathname
  globalThis.__dirname = new URL('.', import.meta.url).pathname
}
