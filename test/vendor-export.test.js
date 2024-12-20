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
import {
  chalk,
  depseek,
  fs,
  minimist,
  ps,
  which,
  YAML,
} from '../build/vendor.js'

describe('vendor chalk API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof chalk, 'function')
    assert.equal(typeof chalk.level, 'number', 'chalk.level')
  })
})

describe('vendor depseek API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof depseek, 'function')
  })
})

describe('vendor fs API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof fs, 'object')
    assert.equal(typeof fs.default, 'object', 'fs.default')
    assert.equal(typeof fs.appendFile, 'function', 'fs.appendFile')
    assert.equal(typeof fs.appendFileSync, 'function', 'fs.appendFileSync')
    assert.equal(typeof fs.access, 'function', 'fs.access')
    assert.equal(typeof fs.accessSync, 'function', 'fs.accessSync')
    assert.equal(typeof fs.chown, 'function', 'fs.chown')
    assert.equal(typeof fs.chownSync, 'function', 'fs.chownSync')
    assert.equal(typeof fs.chmod, 'function', 'fs.chmod')
    assert.equal(typeof fs.chmodSync, 'function', 'fs.chmodSync')
    assert.equal(typeof fs.close, 'function', 'fs.close')
    assert.equal(typeof fs.closeSync, 'function', 'fs.closeSync')
    assert.equal(typeof fs.copyFile, 'function', 'fs.copyFile')
    assert.equal(typeof fs.copyFileSync, 'function', 'fs.copyFileSync')
    assert.equal(typeof fs.cp, 'function', 'fs.cp')
    assert.equal(typeof fs.cpSync, 'function', 'fs.cpSync')
    assert.equal(typeof fs.createReadStream, 'function', 'fs.createReadStream')
    assert.equal(typeof fs.createWriteStream, 'function', 'fs.createWriteStream')
    assert.equal(typeof fs.exists, 'function', 'fs.exists')
    assert.equal(typeof fs.existsSync, 'function', 'fs.existsSync')
    assert.equal(typeof fs.fchown, 'function', 'fs.fchown')
    assert.equal(typeof fs.fchownSync, 'function', 'fs.fchownSync')
    assert.equal(typeof fs.fchmod, 'function', 'fs.fchmod')
    assert.equal(typeof fs.fchmodSync, 'function', 'fs.fchmodSync')
    assert.equal(typeof fs.fdatasync, 'function', 'fs.fdatasync')
    assert.equal(typeof fs.fdatasyncSync, 'function', 'fs.fdatasyncSync')
    assert.equal(typeof fs.fstat, 'function', 'fs.fstat')
    assert.equal(typeof fs.fstatSync, 'function', 'fs.fstatSync')
    assert.equal(typeof fs.fsync, 'function', 'fs.fsync')
    assert.equal(typeof fs.fsyncSync, 'function', 'fs.fsyncSync')
    assert.equal(typeof fs.ftruncate, 'function', 'fs.ftruncate')
    assert.equal(typeof fs.ftruncateSync, 'function', 'fs.ftruncateSync')
    assert.equal(typeof fs.futimes, 'function', 'fs.futimes')
    assert.equal(typeof fs.futimesSync, 'function', 'fs.futimesSync')
    assert.equal(typeof fs.glob, 'function', 'fs.glob')
    assert.equal(typeof fs.globSync, 'function', 'fs.globSync')
    assert.equal(typeof fs.lchown, 'function', 'fs.lchown')
    assert.equal(typeof fs.lchownSync, 'function', 'fs.lchownSync')
    assert.equal(typeof fs.lchmod, 'function', 'fs.lchmod')
    assert.equal(typeof fs.lchmodSync, 'function', 'fs.lchmodSync')
    assert.equal(typeof fs.link, 'function', 'fs.link')
    assert.equal(typeof fs.linkSync, 'function', 'fs.linkSync')
    assert.equal(typeof fs.lstat, 'function', 'fs.lstat')
    assert.equal(typeof fs.lstatSync, 'function', 'fs.lstatSync')
    assert.equal(typeof fs.lutimes, 'function', 'fs.lutimes')
    assert.equal(typeof fs.lutimesSync, 'function', 'fs.lutimesSync')
    assert.equal(typeof fs.mkdir, 'function', 'fs.mkdir')
    assert.equal(typeof fs.mkdirSync, 'function', 'fs.mkdirSync')
    assert.equal(typeof fs.mkdtemp, 'function', 'fs.mkdtemp')
    assert.equal(typeof fs.mkdtempSync, 'function', 'fs.mkdtempSync')
    assert.equal(typeof fs.open, 'function', 'fs.open')
    assert.equal(typeof fs.openSync, 'function', 'fs.openSync')
    assert.equal(typeof fs.openAsBlob, 'function', 'fs.openAsBlob')
    assert.equal(typeof fs.readdir, 'function', 'fs.readdir')
    assert.equal(typeof fs.readdirSync, 'function', 'fs.readdirSync')
    assert.equal(typeof fs.read, 'function', 'fs.read')
    assert.equal(typeof fs.readSync, 'function', 'fs.readSync')
    assert.equal(typeof fs.readv, 'function', 'fs.readv')
    assert.equal(typeof fs.readvSync, 'function', 'fs.readvSync')
    assert.equal(typeof fs.readFile, 'function', 'fs.readFile')
    assert.equal(typeof fs.readFileSync, 'function', 'fs.readFileSync')
    assert.equal(typeof fs.readlink, 'function', 'fs.readlink')
    assert.equal(typeof fs.readlinkSync, 'function', 'fs.readlinkSync')
    assert.equal(typeof fs.realpath, 'function', 'fs.realpath')
    assert.equal(typeof fs.realpathSync, 'function', 'fs.realpathSync')
    assert.equal(typeof fs.rename, 'function', 'fs.rename')
    assert.equal(typeof fs.renameSync, 'function', 'fs.renameSync')
    assert.equal(typeof fs.rm, 'function', 'fs.rm')
    assert.equal(typeof fs.rmSync, 'function', 'fs.rmSync')
    assert.equal(typeof fs.rmdir, 'function', 'fs.rmdir')
    assert.equal(typeof fs.rmdirSync, 'function', 'fs.rmdirSync')
    assert.equal(typeof fs.stat, 'function', 'fs.stat')
    assert.equal(typeof fs.statfs, 'function', 'fs.statfs')
    assert.equal(typeof fs.statSync, 'function', 'fs.statSync')
    assert.equal(typeof fs.statfsSync, 'function', 'fs.statfsSync')
    assert.equal(typeof fs.symlink, 'function', 'fs.symlink')
    assert.equal(typeof fs.symlinkSync, 'function', 'fs.symlinkSync')
    assert.equal(typeof fs.truncate, 'function', 'fs.truncate')
    assert.equal(typeof fs.truncateSync, 'function', 'fs.truncateSync')
    assert.equal(typeof fs.unwatchFile, 'function', 'fs.unwatchFile')
    assert.equal(typeof fs.unlink, 'function', 'fs.unlink')
    assert.equal(typeof fs.unlinkSync, 'function', 'fs.unlinkSync')
    assert.equal(typeof fs.utimes, 'function', 'fs.utimes')
    assert.equal(typeof fs.utimesSync, 'function', 'fs.utimesSync')
    assert.equal(typeof fs.watch, 'function', 'fs.watch')
    assert.equal(typeof fs.watchFile, 'function', 'fs.watchFile')
    assert.equal(typeof fs.writeFile, 'function', 'fs.writeFile')
    assert.equal(typeof fs.writeFileSync, 'function', 'fs.writeFileSync')
    assert.equal(typeof fs.write, 'function', 'fs.write')
    assert.equal(typeof fs.writeSync, 'function', 'fs.writeSync')
    assert.equal(typeof fs.writev, 'function', 'fs.writev')
    assert.equal(typeof fs.writevSync, 'function', 'fs.writevSync')
    assert.equal(typeof fs.Dirent, 'function', 'fs.Dirent')
    assert.equal(typeof fs.Stats, 'function', 'fs.Stats')
    assert.equal(typeof fs.ReadStream, 'function', 'fs.ReadStream')
    assert.equal(typeof fs.WriteStream, 'function', 'fs.WriteStream')
    assert.equal(typeof fs.FileReadStream, 'function', 'fs.FileReadStream')
    assert.equal(typeof fs.FileWriteStream, 'function', 'fs.FileWriteStream')
    assert.equal(typeof fs._toUnixTimestamp, 'function', 'fs._toUnixTimestamp')
    assert.equal(typeof fs.Dir, 'function', 'fs.Dir')
    assert.equal(typeof fs.opendir, 'function', 'fs.opendir')
    assert.equal(typeof fs.opendirSync, 'function', 'fs.opendirSync')
    assert.equal(typeof fs.F_OK, 'number', 'fs.F_OK')
    assert.equal(typeof fs.R_OK, 'number', 'fs.R_OK')
    assert.equal(typeof fs.W_OK, 'number', 'fs.W_OK')
    assert.equal(typeof fs.X_OK, 'number', 'fs.X_OK')
    assert.equal(typeof fs.constants, 'object', 'fs.constants')
    assert.equal(typeof fs.promises, 'object', 'fs.promises')
    assert.equal(typeof fs.gracefulify, 'function', 'fs.gracefulify')
    assert.equal(typeof fs.copy, 'function', 'fs.copy')
    assert.equal(typeof fs.copySync, 'function', 'fs.copySync')
    assert.equal(typeof fs.emptyDirSync, 'function', 'fs.emptyDirSync')
    assert.equal(typeof fs.emptydirSync, 'function', 'fs.emptydirSync')
    assert.equal(typeof fs.emptyDir, 'function', 'fs.emptyDir')
    assert.equal(typeof fs.emptydir, 'function', 'fs.emptydir')
    assert.equal(typeof fs.createFile, 'function', 'fs.createFile')
    assert.equal(typeof fs.createFileSync, 'function', 'fs.createFileSync')
    assert.equal(typeof fs.ensureFile, 'function', 'fs.ensureFile')
    assert.equal(typeof fs.ensureFileSync, 'function', 'fs.ensureFileSync')
    assert.equal(typeof fs.createLink, 'function', 'fs.createLink')
    assert.equal(typeof fs.createLinkSync, 'function', 'fs.createLinkSync')
    assert.equal(typeof fs.ensureLink, 'function', 'fs.ensureLink')
    assert.equal(typeof fs.ensureLinkSync, 'function', 'fs.ensureLinkSync')
    assert.equal(typeof fs.createSymlink, 'function', 'fs.createSymlink')
    assert.equal(typeof fs.createSymlinkSync, 'function', 'fs.createSymlinkSync')
    assert.equal(typeof fs.ensureSymlink, 'function', 'fs.ensureSymlink')
    assert.equal(typeof fs.ensureSymlinkSync, 'function', 'fs.ensureSymlinkSync')
    assert.equal(typeof fs.readJson, 'function', 'fs.readJson')
    assert.equal(typeof fs.readJsonSync, 'function', 'fs.readJsonSync')
    assert.equal(typeof fs.writeJson, 'function', 'fs.writeJson')
    assert.equal(typeof fs.writeJsonSync, 'function', 'fs.writeJsonSync')
    assert.equal(typeof fs.outputJson, 'function', 'fs.outputJson')
    assert.equal(typeof fs.outputJsonSync, 'function', 'fs.outputJsonSync')
    assert.equal(typeof fs.outputJSON, 'function', 'fs.outputJSON')
    assert.equal(typeof fs.outputJSONSync, 'function', 'fs.outputJSONSync')
    assert.equal(typeof fs.writeJSON, 'function', 'fs.writeJSON')
    assert.equal(typeof fs.writeJSONSync, 'function', 'fs.writeJSONSync')
    assert.equal(typeof fs.readJSON, 'function', 'fs.readJSON')
    assert.equal(typeof fs.readJSONSync, 'function', 'fs.readJSONSync')
    assert.equal(typeof fs.mkdirs, 'function', 'fs.mkdirs')
    assert.equal(typeof fs.mkdirsSync, 'function', 'fs.mkdirsSync')
    assert.equal(typeof fs.mkdirp, 'function', 'fs.mkdirp')
    assert.equal(typeof fs.mkdirpSync, 'function', 'fs.mkdirpSync')
    assert.equal(typeof fs.ensureDir, 'function', 'fs.ensureDir')
    assert.equal(typeof fs.ensureDirSync, 'function', 'fs.ensureDirSync')
    assert.equal(typeof fs.move, 'function', 'fs.move')
    assert.equal(typeof fs.moveSync, 'function', 'fs.moveSync')
    assert.equal(typeof fs.outputFile, 'function', 'fs.outputFile')
    assert.equal(typeof fs.outputFileSync, 'function', 'fs.outputFileSync')
    assert.equal(typeof fs.pathExists, 'function', 'fs.pathExists')
    assert.equal(typeof fs.pathExistsSync, 'function', 'fs.pathExistsSync')
    assert.equal(typeof fs.remove, 'function', 'fs.remove')
    assert.equal(typeof fs.removeSync, 'function', 'fs.removeSync')
  })
})

describe('vendor minimist API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof minimist, 'function')
  })
})

describe('vendor ps API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof ps, 'object')
    assert.equal(typeof ps.kill, 'function', 'ps.kill')
    assert.equal(typeof ps.lookup, 'function', 'ps.lookup')
    assert.equal(typeof ps.lookupSync, 'function', 'ps.lookupSync')
    assert.equal(typeof ps.tree, 'function', 'ps.tree')
    assert.equal(typeof ps.treeSync, 'function', 'ps.treeSync')
  })
})

describe('vendor which API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof which, 'function')
    assert.equal(typeof which.sync, 'function', 'which.sync')
  })
})

describe('vendor YAML API ', () => {
  // prettier-ignore
  test('exports', () => {
    assert.equal(typeof YAML, 'object')
    assert.equal(typeof YAML.Alias, 'function', 'YAML.Alias')
    assert.equal(typeof YAML.CST, 'object', 'YAML.CST')
    assert.equal(typeof YAML.Composer, 'function', 'YAML.Composer')
    assert.equal(typeof YAML.Document, 'function', 'YAML.Document')
    assert.equal(typeof YAML.Lexer, 'function', 'YAML.Lexer')
    assert.equal(typeof YAML.LineCounter, 'function', 'YAML.LineCounter')
    assert.equal(typeof YAML.Pair, 'function', 'YAML.Pair')
    assert.equal(typeof YAML.Parser, 'function', 'YAML.Parser')
    assert.equal(typeof YAML.Scalar, 'function', 'YAML.Scalar')
    assert.equal(typeof YAML.Schema, 'function', 'YAML.Schema')
    assert.equal(typeof YAML.YAMLError, 'function', 'YAML.YAMLError')
    assert.equal(typeof YAML.YAMLMap, 'function', 'YAML.YAMLMap')
    assert.equal(typeof YAML.YAMLParseError, 'function', 'YAML.YAMLParseError')
    assert.equal(typeof YAML.YAMLSeq, 'function', 'YAML.YAMLSeq')
    assert.equal(typeof YAML.YAMLWarning, 'function', 'YAML.YAMLWarning')
    assert.equal(typeof YAML.default, 'object', 'YAML.default')
    assert.equal(typeof YAML.isAlias, 'function', 'YAML.isAlias')
    assert.equal(typeof YAML.isCollection, 'function', 'YAML.isCollection')
    assert.equal(typeof YAML.isDocument, 'function', 'YAML.isDocument')
    assert.equal(typeof YAML.isMap, 'function', 'YAML.isMap')
    assert.equal(typeof YAML.isNode, 'function', 'YAML.isNode')
    assert.equal(typeof YAML.isPair, 'function', 'YAML.isPair')
    assert.equal(typeof YAML.isScalar, 'function', 'YAML.isScalar')
    assert.equal(typeof YAML.isSeq, 'function', 'YAML.isSeq')
    assert.equal(typeof YAML.parse, 'function', 'YAML.parse')
    assert.equal(typeof YAML.parseAllDocuments, 'function', 'YAML.parseAllDocuments')
    assert.equal(typeof YAML.parseDocument, 'function', 'YAML.parseDocument')
    assert.equal(typeof YAML.stringify, 'function', 'YAML.stringify')
    assert.equal(typeof YAML.visit, 'function', 'YAML.visit')
    assert.equal(typeof YAML.visitAsync, 'function', 'YAML.visitAsync')
  })
})
