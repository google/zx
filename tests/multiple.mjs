import { strictEqual } from "assert"

import { sleep, YZX } from "../index.mjs"

const $1 = YZX()
const $2 = YZX()
$1.cd("/tmp")
strictEqual($1.cwd, "/tmp")
strictEqual($2.cwd, undefined)

async function f(dir) {
  const $ = YZX()
  await $`mkdir -p ${dir}`
  $.cd(dir)
  await sleep(1)
  const currentDir = (await $`pwd`).stdout.trim()
  strictEqual(currentDir, dir)
}

// Call f several times asynchronously:
f("/tmp/dir1")
f("/tmp/dir2")
