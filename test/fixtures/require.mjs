import { strict as assert } from 'assert'
let data = require('../../package.json')
assert.equal(data.name, 'zx')
assert.equal(data, require('zx/package.json'))
