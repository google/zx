/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { ChildProcess, spawn, StdioNull, StdioPipe } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { inspect } from 'node:util';
import { RequestInfo, RequestInit } from 'node-fetch';
import { Duration, noop, quote } from './util.js';
export type Shell = (pieces: TemplateStringsArray, ...args: any[]) => ProcessPromise;
declare const processCwd: unique symbol;
export type Options = {
    [processCwd]: string;
    cwd?: string;
    verbose: boolean;
    env: NodeJS.ProcessEnv;
    shell: string | boolean;
    prefix: string;
    quote: typeof quote;
    spawn: typeof spawn;
    log: typeof log;
};
export declare const defaults: Options;
export declare const $: Shell & Options;
type Resolve = (out: ProcessOutput) => void;
type IO = StdioPipe | StdioNull;
export declare class ProcessPromise extends Promise<ProcessOutput> {
    child?: ChildProcess;
    private _command;
    private _from;
    private _resolve;
    private _reject;
    private _snapshot;
    private _stdio;
    private _nothrow;
    private _quiet;
    private _timeout?;
    private _timeoutSignal?;
    private _resolved;
    private _halted;
    private _piped;
    _prerun: typeof noop;
    _postrun: typeof noop;
    _bind(cmd: string, from: string, resolve: Resolve, reject: Resolve, options: Options): void;
    run(): ProcessPromise;
    get stdin(): Writable;
    get stdout(): Readable;
    get stderr(): Readable;
    get exitCode(): Promise<number | null>;
    then<R = ProcessOutput, E = ProcessOutput>(onfulfilled?: ((value: ProcessOutput) => PromiseLike<R> | R) | undefined | null, onrejected?: ((reason: ProcessOutput) => PromiseLike<E> | E) | undefined | null): Promise<R | E>;
    catch<T = ProcessOutput>(onrejected?: ((reason: ProcessOutput) => PromiseLike<T> | T) | undefined | null): Promise<ProcessOutput | T>;
    pipe(dest: Writable | ProcessPromise): ProcessPromise;
    kill(signal?: string): Promise<void>;
    stdio(stdin: IO, stdout?: IO, stderr?: IO): ProcessPromise;
    nothrow(): ProcessPromise;
    quiet(): ProcessPromise;
    timeout(d: Duration, signal?: string): ProcessPromise;
    halt(): ProcessPromise;
    get isHalted(): boolean;
}
export declare class ProcessOutput extends Error {
    private readonly _code;
    private readonly _signal;
    private readonly _stdout;
    private readonly _stderr;
    private readonly _combined;
    constructor(code: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string, combined: string, message: string);
    toString(): string;
    get stdout(): string;
    get stderr(): string;
    get exitCode(): number | null;
    get signal(): NodeJS.Signals | null;
    [inspect.custom](): string;
}
export declare function within<R>(callback: () => R): R;
export declare function cd(dir: string | ProcessOutput): void;
export type LogEntry = {
    kind: 'cmd';
    verbose: boolean;
    cmd: string;
} | {
    kind: 'stdout' | 'stderr';
    verbose: boolean;
    data: Buffer;
} | {
    kind: 'cd';
    dir: string;
} | {
    kind: 'fetch';
    url: RequestInfo;
    init?: RequestInit;
} | {
    kind: 'retry';
    error: string;
} | {
    kind: 'custom';
    data: any;
};
export declare function log(entry: LogEntry): void;
export {};
