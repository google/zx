import { strict as assert } from 'assert'

let cwd = process.cwd()
assert.equal($.cwd, cwd)
try {
  fs.mkdirpSync('/tmp/zx-cd-test/one/two')
  cd('/tmp/zx-cd-test/one/two')
  let p1 = $`pwd`
  assert.ok($.cwd.endsWith('/two'))
  assert.ok(process.cwd().endsWith('/two'))

  cd('..')
  let p2 = $`pwd`
  assert.ok($.cwd.endsWith('/one'))
  assert.ok(process.cwd().endsWith('/one'))

  cd('..')
  let p3 = $`pwd`
  assert.ok(process.cwd().endsWith('/zx-cd-test'))
  assert.ok($.cwd.endsWith('/tmp/zx-cd-test'))

  let results = (await Promise.all([p1, p2, p3])).map((p) =>
    path.basename(p.stdout.trim())
  )

  assert.deepEqual(results, ['two', 'one', 'zx-cd-test'])
} catch (e) {
  assert(!e, e)
} finally {
  fs.rmSync('/tmp/zx-cd-test', { recursive: true })
  cd(cwd)
  assert.equal($.cwd, cwd)
}
