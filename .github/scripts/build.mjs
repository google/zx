#!/usr/bin/env zx

import path from 'path'

$.verbose = false

let input = path.join(__dirname, '../../index.mjs')
let output = path.join(path.dirname(input), 'index.cjs')

console.log('Building')
console.log('   input:', input)
console.log('  output:', output)

let i = 0,
  spin = () => process.stdout.write(`  ${[...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'][i++ % 10]}\r`),
  stop = (id => () => clearInterval(id))(setInterval(spin, 100))

let {stdout: code} = await $`rollup --format cjs --plugin commonjs,node-resolve ${input}`
code = code.replace(/node:(\w+)/g, '$1')
await fs.writeFile(output, code)

stop()

console.log(chalk.black.bgGreenBright(' DONE '))
