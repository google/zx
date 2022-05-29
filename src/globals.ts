import * as _ from './index.js'

Object.assign(global, _)

declare global {
  var $: typeof _.$
  var argv: typeof _.argv
  var cd: typeof _.cd
  var chalk: typeof _.chalk
  // @ts-ignore
  // TODO: This not working for some reason.
  // var fetch: typeof _.fetch
  var fs: typeof _.fs
  var glob: typeof _.glob
  var globby: typeof _.globby
  var nothrow: typeof _.nothrow
  var os: typeof _.os
  var path: typeof _.path
  var question: typeof _.question
  var quiet: typeof _.quiet
  var sleep: typeof _.sleep
  var which: typeof _.which
  var YAML: typeof _.YAML
}
