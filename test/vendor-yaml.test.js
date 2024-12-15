// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from 'node:assert'
import { test, describe } from 'node:test'
import { YAML } from '../build/vendor.js'

describe('vendor YAML API ', () => {
  test('exports', () => {
    assert.equal(typeof YAML, 'object')
    assert.equal(typeof YAML.Alias, 'function')
    assert.equal(typeof YAML.CST, 'object')
    assert.equal(typeof YAML.Composer, 'function')
    assert.equal(typeof YAML.Document, 'function')
    assert.equal(typeof YAML.Lexer, 'function')
    assert.equal(typeof YAML.LineCounter, 'function')
    assert.equal(typeof YAML.Pair, 'function')
    assert.equal(typeof YAML.Parser, 'function')
    assert.equal(typeof YAML.Scalar, 'function')
    assert.equal(typeof YAML.Schema, 'function')
    assert.equal(typeof YAML.YAMLError, 'function')
    assert.equal(typeof YAML.YAMLMap, 'function')
    assert.equal(typeof YAML.YAMLParseError, 'function')
    assert.equal(typeof YAML.YAMLSeq, 'function')
    assert.equal(typeof YAML.YAMLWarning, 'function')
    assert.equal(typeof YAML.default, 'object')
    assert.equal(typeof YAML.isAlias, 'function')
    assert.equal(typeof YAML.isCollection, 'function')
    assert.equal(typeof YAML.isDocument, 'function')
    assert.equal(typeof YAML.isMap, 'function')
    assert.equal(typeof YAML.isNode, 'function')
    assert.equal(typeof YAML.isPair, 'function')
    assert.equal(typeof YAML.isScalar, 'function')
    assert.equal(typeof YAML.isSeq, 'function')
    assert.equal(typeof YAML.parse, 'function')
    assert.equal(typeof YAML.parseAllDocuments, 'function')
    assert.equal(typeof YAML.parseDocument, 'function')
    assert.equal(typeof YAML.stringify, 'function')
    assert.equal(typeof YAML.visit, 'function')
    assert.equal(typeof YAML.visitAsync, 'function')
  })
})
