"use strict";
import "./deno.js"
import * as __module__ from "./vendor-extra.cjs"
const {
  YAML,
  createRequire,
  depseek,
  dotenv,
  fs,
  glob,
  globbyModule,
  minimist,
  nodeFetch,
  Alias,
  CST,
  Composer,
  Document,
  Lexer,
  LineCounter,
  Pair,
  Parser,
  Scalar,
  Schema,
  YAMLError,
  YAMLMap,
  YAMLParseError,
  YAMLSeq,
  YAMLWarning,
  isAlias,
  isCollection,
  isDocument,
  isMap,
  isNode,
  isPair,
  isScalar,
  isSeq,
  parse,
  parseAllDocuments,
  parseDocument,
  stringify,
  visit,
  visitAsync,
  BOM,
  DOCUMENT,
  FLOW_END,
  SCALAR,
  createScalarToken,
  prettyToken,
  resolveAsScalar,
  setScalarValue,
  tokenType,
  default: __default__
} = globalThis.Deno ? globalThis.require("./vendor-extra.cjs") : __module__
export {
  YAML,
  createRequire,
  depseek,
  dotenv,
  fs,
  glob,
  globbyModule,
  minimist,
  nodeFetch,
  Alias,
  CST,
  Composer,
  Document,
  Lexer,
  LineCounter,
  Pair,
  Parser,
  Scalar,
  Schema,
  YAMLError,
  YAMLMap,
  YAMLParseError,
  YAMLSeq,
  YAMLWarning,
  isAlias,
  isCollection,
  isDocument,
  isMap,
  isNode,
  isPair,
  isScalar,
  isSeq,
  parse,
  parseAllDocuments,
  parseDocument,
  stringify,
  visit,
  visitAsync,
  BOM,
  DOCUMENT,
  FLOW_END,
  SCALAR,
  createScalarToken,
  prettyToken,
  resolveAsScalar,
  setScalarValue,
  tokenType
}
export default __default__
