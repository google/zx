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

import assert from 'node:assert'
import * as globbyModule from 'globby'
import minimist from 'minimist'
import nodeFetch, { RequestInfo, RequestInit } from 'node-fetch'
import { createInterface } from 'node:readline'
import * as readline from "readline";
import { $, within, ProcessOutput } from './core.js'
import { Duration, isString, parseDuration } from './util.js'
import chalk from 'chalk'

export { default as chalk } from 'chalk'
export { default as fs } from 'fs-extra'
export { default as which } from 'which'
export { default as minimist } from 'minimist'
export { default as YAML } from 'yaml'
export { default as path } from 'node:path'
export { default as os } from 'node:os'
export { ssh } from 'webpod'

export let argv = minimist(process.argv.slice(2))
export function updateArgv(args: string[]) {
  argv = minimist(args)
  ;(global as any).argv = argv
}

export const globby = Object.assign(function globby(
  patterns: string | readonly string[],
  options?: globbyModule.Options
) {
  return globbyModule.globby(patterns, options)
},
globbyModule)
export const glob = globby

export function sleep(duration: Duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, parseDuration(duration))
  })
}

export async function fetch(url: RequestInfo, init?: RequestInit) {
  $.log({ kind: 'fetch', url, init })
  return nodeFetch(url, init)
}

export function echo(...args: any[]): void
export function echo(pieces: TemplateStringsArray, ...args: any[]) {
  let msg
  const lastIdx = pieces.length - 1
  if (
    Array.isArray(pieces) &&
    pieces.every(isString) &&
    lastIdx === args.length
  ) {
    msg =
      args.map((a, i) => pieces[i] + stringify(a)).join('') + pieces[lastIdx]
  } else {
    msg = [pieces, ...args].map(stringify).join(' ')
  }
  console.log(msg)
}

function stringify(arg: ProcessOutput | any) {
  if (arg instanceof ProcessOutput) {
    return arg.toString().replace(/\n$/, '')
  }
  return `${arg}`
}

export async function question(
  query?: string,
  options?: { choices: string[] }
): Promise<string> {
  let completer = undefined
  if (options && Array.isArray(options.choices)) {
    /* c8 ignore next 5 */
    completer = function completer(line: string) {
      const completions = options.choices
      const hits = completions.filter((c) => c.startsWith(line))
      return [hits.length ? hits : completions, line]
    }
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer,
  })

  return new Promise((resolve) =>
    rl.question(query ?? '', (answer) => {
      rl.close()
      resolve(answer)
    })
  )
}

export async function select(
  query: string,
  options: string[],
  selector: string = '> ',
): Promise<string> {
  const input = process.stdin
  const output = process.stdout

  const ansiEraseLines = (count: number) => {
    //adapted from sindresorhus ansi-escape module
    const ESC = '\u001B['
    const eraseLine = ESC + '2K';
    const cursorUp = (count = 1) => ESC + count + 'A'
    const cursorLeft = ESC + 'G'

    let clear = '';

    for (let i = 0; i < count; i++) {
      clear += eraseLine + (i < count - 1 ? cursorUp() : '');
    }

    if (count) {
      clear += cursorLeft;
    }

    return clear;

  }
  const keyPressedHandler = (_: any, key: { name: string; ctrl: any }) => {
    if (!key) {
      return;
    }

    const optionLength = options.length - 1;
    if ( key.name === 'down') {
      selectOption.selectIndex === optionLength ? selectOption.selectIndex = 0 : selectOption.selectIndex += 1;
      selectOption.createOptionMenu();
      return;
    }

    if (key.name === 'up') {
      selectOption.selectIndex === 0 ? selectOption.selectIndex = optionLength : selectOption.selectIndex -= 1;
      selectOption.createOptionMenu();
      return;
    }

    if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
      selectOption.close();
    }
  }

  const selectOption = {
    selectIndex: 0,
    initialShow: true,
    createOptionMenu: () => {
      if (selectOption.initialShow) {
        selectOption.initialShow = false
      } else {
        output.write(ansiEraseLines(options.length + 1));
      }

      for (let i= 0; i < options.length; i++) {
        output.write(`  [${chalk.green(i)}] ${options[i]}\n`);
      }

      output.write(` ${selector}${chalk.bgWhite(chalk.black(options[selectOption.selectIndex]))}`);
    },
    init: () => {
      echo(chalk.bgCyan(query));

      readline.emitKeypressEvents(input);
      selectOption.start();
    },
    start: () => {
      input.setRawMode(true);
      input.resume();
      input.on('keypress', keyPressedHandler);

      if (selectOption.selectIndex >= 0) {
        selectOption.createOptionMenu();
      }
    },
    close: () => {
      output.write('\n');
      input.setRawMode(false);
      input.pause();
    },
  }

  return new Promise((resolve) => {
    selectOption.init();

    input.on('keypress', (_: any, key: { name: string; ctrl: any }) => {
      if (key && key.name === 'return') {
        selectOption.close();
        resolve(options[selectOption.selectIndex]);
      }
    })
  });
}

export async function stdin() {
  let buf = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) {
    buf += chunk
  }
  return buf
}

export async function retry<T>(count: number, callback: () => T): Promise<T>
export async function retry<T>(
  count: number,
  duration: Duration | Generator<number>,
  callback: () => T
): Promise<T>
export async function retry<T>(
  count: number,
  a: Duration | Generator<number> | (() => T),
  b?: () => T
): Promise<T> {
  const total = count
  let callback: () => T
  let delayStatic = 0
  let delayGen: Generator<number> | undefined
  if (typeof a == 'function') {
    callback = a
  } else {
    if (typeof a == 'object') {
      delayGen = a
    } else {
      delayStatic = parseDuration(a)
    }
    assert(b)
    callback = b
  }
  let lastErr: unknown
  let attempt = 0
  while (count-- > 0) {
    attempt++
    try {
      return await callback()
    } catch (err) {
      let delay = 0
      if (delayStatic > 0) delay = delayStatic
      if (delayGen) delay = delayGen.next().value
      $.log({
        kind: 'retry',
        error:
          chalk.bgRed.white(' FAIL ') +
          ` Attempt: ${attempt}${total == Infinity ? '' : `/${total}`}` +
          (delay > 0 ? `; next in ${delay}ms` : ''),
      })
      lastErr = err
      if (count == 0) break
      if (delay) await sleep(delay)
    }
  }
  throw lastErr
}

export function* expBackoff(max: Duration = '60s', rand: Duration = '100ms') {
  const maxMs = parseDuration(max)
  const randMs = parseDuration(rand)
  let n = 1
  while (true) {
    const ms = Math.floor(Math.random() * randMs)
    yield Math.min(2 ** n++, maxMs) + ms
  }
}

export async function spinner<T>(callback: () => T): Promise<T>
export async function spinner<T>(title: string, callback: () => T): Promise<T>
export async function spinner<T>(
  title: string | (() => T),
  callback?: () => T
): Promise<T> {
  if (typeof title == 'function') {
    callback = title
    title = ''
  }
  let i = 0
  const spin = () =>
    process.stderr.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`)
  return within(async () => {
    $.verbose = false
    const id = setInterval(spin, 100)
    let result: T
    try {
      result = await callback!()
    } finally {
      clearInterval(id)
      process.stderr.write(' '.repeat(process.stdout.columns - 1) + '\r')
    }
    return result
  })
}
