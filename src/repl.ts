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

import os from 'node:os'
import path from 'node:path'
import repl from 'node:repl'
import { inspect } from 'node:util'
import { ProcessOutput, defaults } from './core.js'
import { chalk } from './vendor-core.js'

const HISTORY =
  process.env.ZX_REPL_HISTORY ?? path.join(os.homedir(), '.zx_repl_history')

export async function startRepl(history = HISTORY) {
  defaults.verbose = false
  const r = repl.start({
    prompt: chalk.greenBright.bold('❯ '),
    useGlobal: true,
    preview: false,
    writer(output: any) {
      return output instanceof ProcessOutput
        ? output.toString().trimEnd()
        : inspect(output, { colors: true })
    },
  })
  r.setupHistory(history, () => {})
}
