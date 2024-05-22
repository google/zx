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

import assert from 'node:assert';
import { createInterface } from 'node:readline';
import { $, within, ProcessOutput } from './core.js';
import { type Duration, isString, parseDuration } from './util.js';
import {
  chalk,
  minimist,
  nodeFetch,
  RequestInfo,
  RequestInit,
} from './vendor.js';

export { default as path } from 'node:path';
export * as os from 'node:os';

export let argv = minimist(process.argv.slice(2));

/**
 * Updates the global argv object with new arguments.
 * @param {string[]} args - New arguments to set.
 */
export function updateArgv(args) {
  argv = minimist(args);
  global.argv = argv;
}

/**
 * Sleeps for the specified duration.
 * @param {Duration} duration - Duration to sleep.
 * @returns {Promise<void>}
 */
export function sleep(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, parseDuration(duration));
  });
}

/**
 * Fetches a URL with the given initialization options.
 * @param {RequestInfo} url - The URL to fetch.
 * @param {RequestInit} [init] - Initialization options.
 * @returns {Promise<Response>}
 */
export async function fetch(url, init) {
  $.log({ kind: 'fetch', url, init });
  return nodeFetch(url, init);
}

/**
 * Echoes the provided arguments or template string to the console.
 * @param {TemplateStringsArray | any[]} pieces - Template strings array or arguments.
 * @param {...any} args - Arguments to echo.
 */
export function echo(pieces, ...args) {
  let msg;
  const lastIdx = pieces.length - 1;
  if (Array.isArray(pieces) && pieces.every(isString) && lastIdx === args.length) {
    msg = args.map((a, i) => pieces[i] + stringify(a)).join('') + pieces[lastIdx];
  } else {
    msg = [pieces, ...args].map(stringify).join(' ');
  }
  console.log(msg);
}

/**
 * Converts an argument to a string.
 * @param {ProcessOutput | any} arg - Argument to stringify.
 * @returns {string}
 */
function stringify(arg) {
  if (arg instanceof ProcessOutput) {
    return arg.toString().replace(/\n$/, '');
  }
  return `${arg}`;
}

/**
 * Prompts the user with a question and returns their answer.
 * @param {string} [query] - The question to prompt.
 * @param {Object} [options] - Options for the prompt.
 * @param {string[]} [options.choices] - Choices for auto-completion.
 * @returns {Promise<string>}
 */
export async function question(query, options) {
  let completer;
  if (options?.choices) {
    completer = function (line) {
      const completions = options.choices;
      const hits = completions.filter(c => c.startsWith(line));
      return [hits.length ? hits : completions, line];
    };
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer,
  });

  return new Promise(resolve => 
    rl.question(query ?? '', answer => {
      rl.close();
      resolve(answer);
    })
  );
}

/**
 * Reads input from stdin and returns it as a string.
 * @returns {Promise<string>}
 */
export async function stdin() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    buf += chunk;
  }
  return buf;
}

/**
 * Retries a callback function a specified number of times with optional delay between attempts.
 * @template T
 * @param {number} count - Number of retry attempts.
 * @param {Duration | Generator<number> | (() => T)} a - Delay duration or callback function.
 * @param {(() => T)} [b] - Callback function.
 * @returns {Promise<T>}
 */
export async function retry(count, a, b) {
  const total = count;
  let callback, delayStatic = 0, delayGen;
  
  if (typeof a === 'function') {
    callback = a;
  } else {
    if (typeof a === 'object') {
      delayGen = a;
    } else {
      delayStatic = parseDuration(a);
    }
    assert(b);
    callback = b;
  }
  
  let lastErr, attempt = 0;
  while (count-- > 0) {
    attempt++;
    try {
      return await callback();
    } catch (err) {
      let delay = delayStatic;
      if (delayGen) delay = delayGen.next().value;
      $.log({
        kind: 'retry',
        error: `${chalk.bgRed.white(' FAIL ')} Attempt: ${attempt}${total === Infinity ? '' : `/${total}`}` + (delay > 0 ? `; next in ${delay}ms` : ''),
      });
      lastErr = err;
      if (count === 0) break;
      if (delay) await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Exponential backoff generator for retry delays.
 * @param {Duration} [max='60s'] - Maximum backoff duration.
 * @param {Duration} [rand='100ms'] - Random jitter duration.
 * @returns {Generator<number>}
 */
export function* expBackoff(max = '60s', rand = '100ms') {
  const maxMs = parseDuration(max);
  const randMs = parseDuration(rand);
  let n = 1;
  while (true) {
    const ms = Math.floor(Math.random() * randMs);
    yield Math.min(2 ** n++, maxMs) + ms;
  }
}

/**
 * Displays a spinner while a callback function is executing.
 * @template T
 * @param {string | (() => T)} title - Spinner title or callback function.
 * @param {(() => T)} [callback] - Callback function.
 * @returns {Promise<T>}
 */
export async function spinner(title, callback) {
  if (typeof title === 'function') {
    callback = title;
    title = '';
  }
  
  let i = 0;
  const spin = () => process.stderr.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]} ${title}\r`);
  
  return within(async () => {
    $.verbose = false;
    const id = setInterval(spin, 100);
    let result;
    try {
      result = await callback();
    } finally {
      clearInterval(id);
      process.stderr.write(' '.repeat(process.stdout.columns || 1) + '\r');
    }
    return result;
  });
}
