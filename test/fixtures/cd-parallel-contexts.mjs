import { strict as assert } from 'assert'
import { ProcessPromise } from '../../build/index.js'
import { runInCtx, getCtx } from '../../build/experimental.js'

let cwd = process.cwd()
let resolve, reject
let promise = new ProcessPromise((...args) => ([resolve, reject] = args))

try {
  fs.mkdirpSync('/tmp/zx-cd-parallel')
  runInCtx({ ...getCtx() }, async () => {
    assert.equal($.cwd, cwd)
    await sleep(10)
    cd('/tmp/zx-cd-parallel')
    assert.ok(getCtx().cwd.endsWith('/zx-cd-parallel'))
    assert.ok($.cwd.endsWith('/zx-cd-parallel'))
  })

  runInCtx({ ...getCtx() }, async () => {
    assert.equal($.cwd, cwd)
    assert.equal(getCtx().cwd, cwd)
    await sleep(20)
    assert.equal(getCtx().cwd, cwd)
    assert.ok($.cwd.endsWith('/zx-cd-parallel'))
    resolve()
  })

  await promise
} catch (e) {
  assert(!e, e)
} finally {
  fs.rmSync('/tmp/zx-cd-parallel', { recursive: true })
  cd(cwd)
}
