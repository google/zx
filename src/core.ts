// Copyright 2021 Google LLC
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
import { spawn, spawnSync, type StdioOptions, type IOType } from 'node:child_process';
import { type Encoding } from 'node:crypto';
import { AsyncHook, AsyncLocalStorage, createHook } from 'node:async_hooks';
import { Readable, Writable } from 'node:stream';
import { inspect } from 'node:util';

import {
  exec,
  buildCmd,
  chalk,
  which,
  ps,
  type ChalkInstance,
  type RequestInfo,
  type RequestInit,
} from './vendor.js';

import {
  Duration,
  errnoMessage,
  exitCodeInfo,
  formatCmd,
  getCallerLocation,
  noop,
  parseDuration,
  quote,
  quotePowerShell,
  noquote,
  ensureEol,
  preferNmBin,
} from './util.js';

export interface Shell {
  (pieces: TemplateStringsArray, ...args: any[]): ProcessPromise;
  (opts: Partial<Options>): Shell;
  sync: {
    (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput;
    (opts: Partial<Options>): Shell;
  };
}

const processCwd = Symbol('processCwd');
const syncExec = Symbol('syncExec');

export interface Options {
  [processCwd]: string;
  [syncExec]: boolean;
  cwd?: string;
  ac?: AbortController;
  signal?: AbortSignal;
  input?: string | Buffer | Readable | ProcessOutput | ProcessPromise;
  timeout?: Duration;
  timeoutSignal?: string;
  stdio: StdioOptions;
  verbose: boolean;
  sync: boolean;
  env: NodeJS.ProcessEnv;
  shell: string | boolean;
  nothrow: boolean;
  prefix: string;
  postfix: string;
  quote: typeof quote;
  quiet: boolean;
  detached: boolean;
  preferLocal: boolean;
  spawn: typeof spawn;
  spawnSync: typeof spawnSync;
  log: typeof log;
  kill: typeof kill;
}

const storage = new AsyncLocalStorage<Options>();
const cwdSyncHook: AsyncHook & { enabled?: boolean } = createHook({
  init: syncCwd,
  before: syncCwd,
  promiseResolve: syncCwd,
  after: syncCwd,
  destroy: syncCwd,
});

export function syncProcessCwd(flag = true) {
  flag ? cwdSyncHook.enable() : cwdSyncHook.disable();
}

export const defaults: Options = {
  [processCwd]: process.cwd(),
  [syncExec]: false,
  verbose: false,
  env: process.env,
  sync: false,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
  nothrow: false,
  quiet: false,
  prefix: '',
  postfix: '',
  quote: noquote,
  detached: false,
  preferLocal: false,
  spawn,
  spawnSync,
  log,
  kill,
};

export function usePowerShell() {
  $.shell = which.sync('powershell.exe');
  $.prefix = '';
  $.postfix = '; exit $LastExitCode';
  $.quote = quotePowerShell;
}

export function usePwsh() {
  $.shell = which.sync('pwsh');
  $.prefix = '';
  $.postfix = '; exit $LastExitCode';
  $.quote = quotePowerShell;
}

export function useBash() {
  $.shell = which.sync('bash');
  $.prefix = 'set -euo pipefail;';
  $.postfix = '';
  $.quote = quote;
}

function checkShell() {
  if (!$.shell) {
    throw new Error(`Shell is not available: setup guide goes here`);
  }
}

function getStore() {
  return storage.getStore() || defaults;
}

export const $: Shell & Options = new Proxy<Shell & Options>(
  function (pieces, ...args) {
    checkShell();

    if (!Array.isArray(pieces)) {
      return function (this: any, ...args: any) {
        const self = this;
        return within(() => Object.assign($, pieces).apply(self, args));
      };
    }
    
    const from = getCallerLocation();
    if (pieces.some((p) => p === undefined)) {
      throw new Error(`Malformed command at ${from}`);
    }
    
    let resolve: Resolve, reject: Resolve;
    const promise = new ProcessPromise((res, rej) => ([resolve, reject] = [res, rej]));
    const cmd = buildCmd($.quote, pieces as TemplateStringsArray, args) as string;
    const snapshot = getStore();
    const sync = snapshot[syncExec];
    const callback = () => promise.isHalted || promise.run();

    promise._bind(
      cmd,
      from,
      resolve!,
      (v: ProcessOutput) => {
        reject!(v);
        if (sync) throw v;
      },
      snapshot
    );

    sync ? callback() : setImmediate(callback);

    return sync ? promise.output : promise;
  } as Shell & Options,
  {
    set(_, key, value) {
      const target = key in Function.prototype ? _ : getStore();
      Reflect.set(target, key === 'sync' ? syncExec : key, value);

      return true;
    },
    get(_, key) {
      if (key === 'sync') return $({ sync: true });

      const target = key in Function.prototype ? _ : getStore();
      return Reflect.get(target, key);
    },
  }
);

try {
  useBash();
} catch (err) {}

type Resolve = (out: ProcessOutput) => void;

export class ProcessPromise extends Promise<ProcessOutput> {
  private _command = '';
  private _from = '';
  private _resolve: Resolve = noop;
  private _reject: Resolve = noop;
  private _snapshot = getStore();
  private _stdio?: StdioOptions;
  private _nothrow?: boolean;
  private _quiet?: boolean;
  private _timeout?: number;
  private _timeoutSignal = 'SIGTERM';
  private _resolved = false;
  private _halted = false;
  private _piped = false;
  private _execResult: ReturnType<typeof exec> | null = null;
  private _output: ProcessOutput | null = null;
  private _prerun = noop;
  private _postrun = noop;

  _bind(
    cmd: string,
    from: string,
    resolve: Resolve,
    reject: Resolve,
    options: Options
  ) {
    this._command = cmd;
    this._from = from;
    this._resolve = resolve;
    this._reject = reject;
    this._snapshot = { ac: new AbortController(), ...options };
  }

  run(): ProcessPromise {
    if (this.child) return this;

    this._prerun();

    const $ = this._snapshot;
    const self = this;
    const input = ($.input as ProcessPromise | ProcessOutput)?.stdout ?? $.input;

    if (input) this.stdio('pipe');
    if ($.timeout) this.timeout($.timeout, $.timeoutSignal);
    if ($.preferLocal) $.env = preferNmBin($.env, $.cwd, $[processCwd]);

    $.log({
      kind: 'cmd',
      cmd: this._command,
      verbose: self.isVerbose(),
    });

    this._execResult = exec({
      input,
      cmd: $.prefix + self._command + $.postfix,
      cwd: $.cwd ?? $[processCwd],
      ac: $.ac,
      signal: $.signal,
      shell: typeof $.shell === 'string' ? $.shell : true,
      env: $.env,
      spawn: $.spawn,
      spawnSync: $.spawnSync,
      stdio: self._stdio ?? $.stdio,
      sync: $[syncExec],
      detached: $.detached,
      run: (cb) => cb(),
      on: {
        start: () => {
          if (self._timeout) {
            const timeoutId = setTimeout(
              () => self.kill(self._timeoutSignal),
              self._timeout
            );
            self.finally(() => clearTimeout(timeoutId)).catch(noop);
          }
        },
        stdout: (data) => {
          if (!self._piped) {
            $.log({ kind: 'stdout', data, verbose: self.isVerbose() });
          }
        },
        stderr: (data) => {
          $.log({ kind: 'stderr', data, verbose: !self.isQuiet() });
        },
        end: ({ error, stdout, stderr, stdall, status, signal }) => {
          self._resolved = true;

          if (error) {
            const message = ProcessOutput.getErrorMessage(error, self._from);
            const output = new ProcessOutput(null, null, stdout, stderr, stdall, message);
            self._output = output;
            self._reject(output);
          } else {
            const
