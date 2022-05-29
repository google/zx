import { strict } from 'assert'

strict.equal(path.basename(__filename), 'filename-dirname.mjs')
strict.equal(path.basename(__dirname), 'fixtures')
