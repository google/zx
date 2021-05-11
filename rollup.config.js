import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

function getConfig (opts)  {
  return {
    input: opts.input,
    output: {
      dir: 'dist',
      entryFileNames: '[name].mjs',
      banner: opts.bin && '#!/usr/bin/env node\n',
      format: 'esm',
      preferConst: true
    },
    plugins: [
      resolve(),
      json({ preferConst: true }),
      commonjs()
    ]
  }
}

export default [
  getConfig({ input: 'zx.mjs', bin: true }),
  getConfig({ input: 'index.mjs' }),
]
