import {
  $,
  argv as _argv,
  cd,
  chalk as _chalk,
  fetch as _fetch,
  fs as _fs,
  globby as _globby,
  nothrow,
  os as _os,
  path as _path,
  question,
  sleep,
} from '.'

declare global {
  var $: $
  var argv: typeof _argv
  var cd: cd
  var chalk: typeof _chalk
  // @ts-ignore
  var fetch: typeof _fetch
  var fs: typeof _fs
  var globby: typeof _globby.globby & typeof _globby
  var glob: typeof _globby.globby & typeof _globby
  var nothrow: nothrow
  var os: typeof _os
  var path: typeof _path
  var question: question
  var sleep: sleep
}
