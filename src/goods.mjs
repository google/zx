import * as globbyModule from 'globby'
import minimist from 'minimist'
import { promisify } from 'node:util'
import psTreeModule from 'ps-tree'

export { default as chalk } from 'chalk'
export { default as nodeFetch } from 'node-fetch'
export { default as fs } from 'fs-extra'
export { default as which } from 'which'
export { default as YAML } from 'yaml'
export { default as path } from 'node:path'

export const argv = minimist(process.argv.slice(2))

export const globby = Object.assign(function globby(...args) {
  return globbyModule.globby(...args)
}, globbyModule)

export const glob = globby

export const sleep = promisify(setTimeout)

export const psTree = promisify(psTreeModule)

