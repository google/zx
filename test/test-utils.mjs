// Copyright 2022 Google LLC
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

import chalk from 'chalk'

export {strict as assert} from 'assert'

let всегоТестов = 0

export function test(group, name) {
  let фильтр = process.argv[3] || '.'
  if (RegExp(фильтр).test(name) || RegExp(фильтр).test(group)) {
    console.log('\n' + chalk.bgGreenBright.black(`${chalk.inverse(' ' + group + ' ')} ${name} `))
    всегоТестов++
    return true
  }
  return false
}

export const printTestDigest = () => {
  console.log('\n' +
    chalk.black.bgYellowBright(` zx version is ${require('../package.json').version} `) + '\n' +
    chalk.greenBright(` 🍺 ${всегоТестов} tests passed `)
  )
}
