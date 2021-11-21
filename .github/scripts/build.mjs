#!/usr/bin/env yzx

$.verbose = false
console.log(chalk.black.bgYellowBright` BUILD `)
let i = 0,
  spin = () => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]}\r`),
  stop = (id => () => clearInterval(id))(setInterval(spin, 100))

let indexFile = path.join(__dirname, '../../index.mjs')
let outputDir = path.join(path.dirname(indexFile), 'dist')
await fs.ensureDir(outputDir)

{
  let outputFile = 'bundle.cjs'
  console.log('>', outputFile)
  let {stdout: bundle} = await $`rollup --format cjs --plugin commonjs,node-resolve ${indexFile}`
  bundle = bundle
    .replace(/node:(\w+)/g, '$1')
  await fs.writeFile(path.join(outputDir, outputFile), bundle)
}

{
  let outputFile = 'globals.cjs'
  console.log('>', outputFile)
  await fs.writeFile(path.join(outputDir, outputFile),
    `const {registerGlobals} = require('./index.cjs')

registerGlobals()
`)
}

{
  let outputFile = 'index.cjs'
  console.log('>', outputFile)
  const exportNames = Object.keys(await import(indexFile))
  await fs.writeFile(path.join(outputDir, outputFile),
    `const {${exportNames.join(', ')}} = require('./bundle.cjs')
module.exports = {${exportNames.join(', ')}}
`)
}

stop()
console.log(chalk.black.bgGreenBright` DONE `)
