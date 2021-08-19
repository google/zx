#!/usr/bin/env ts-node
import {$} from '@cspotcode/zx'
// import {$} from '..'

async function main() {
    await $`echo 'Hello  World!'`
    console.dir(await glob('**/*.ts'))
}

main()
