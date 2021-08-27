#!/usr/bin/env zx

import path from 'path'

$.verbose = false

let inputFile = path.join(__dirname, '../../index.mjs')
let outputDir = path.join(path.dirname(inputFile), 'dist')

console.log(chalk.black.bgYellowBright` BUILD `)
console.log('- inputFile:', inputFile)
console.log('- outputDir:', outputDir)

let i = 0,
  spin = () => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]}\r`),
  stop = (id => () => clearInterval(id))(setInterval(spin, 100))

let {stdout: bundle} = await $`rollup --format cjs --plugin commonjs,node-resolve ${inputFile}`
bundle = bundle
  .replace(/node:(\w+)/g, '$1')
  .replace(`Object.defineProperty(exports, '__esModule', { value: true });`, ``)

await fs.ensureDir(outputDir)
await fs.writeFile(path.join(outputDir, 'bundle.cjs'), bundle)

const exportNames = Object.keys(await import(inputFile))
await fs.writeFile(path.join(outputDir, 'index.cjs'),
  `const {${exportNames.join(', ')}} = require('./bundle.cjs')
module.exports = {${exportNames.join(', ')}}
`)

stop()

console.log(chalk.black.bgGreenBright` DONE `)
