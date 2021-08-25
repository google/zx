#!/usr/bin/env node

import path from 'path';
import url from 'url';
import {$, fs} from '../../index.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

let input = path.join(__dirname, '../../index.mjs')
let cjsOutput = path.join(path.dirname(input), 'index.cjs')
let mjsOutput = path.join(path.dirname(input), 'import.mjs')

console.log('Building')
console.log('   input:', input)
console.log('  cjs output:', cjsOutput)
console.log('  mjs output:', mjsOutput)

let i = 0,
  spin = () => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]}\r`),
  stop = (id => () => clearInterval(id))(setInterval(spin, 100))

const resolveNodeBuiltinsForOlderNodeVersion = {
  name: 'example',
  setup(build) {
    build.onResolve({ filter: /^node:/ }, args => {
      return { path: args.path.replace(/^node:/, ''), external: true }
    })
  },
}

const code = await (await import('esbuild')).build({
  bundle: true,
  entryPoints: [input],
  outfile: cjsOutput,
  platform: 'node',
  target: 'node12',
  plugins: [resolveNodeBuiltinsForOlderNodeVersion]
}).catch(() => process.exit(1))

const exportNames = Object.keys(await import(input))
await fs.writeFile(mjsOutput, `
import * as lib from './index.cjs' 
const {${exportNames.join(', ')}} = lib
export {${exportNames.join(', ')}}
`)

stop()

console.log(chalk.black.bgGreenBright(' DONE '))
