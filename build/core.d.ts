/// <reference types="node" />
/// <reference types="fs-extra" />

import { type ChildProcess, type IOType, type StdioOptions, spawn, spawnSync } from 'node:child_process';
import { type Encoding } from 'node:crypto';
import { type Readable, type Writable } from 'node:stream';
import { inspect } from 'node:util';
import { Buffer } from 'node:buffer';
import { type TSpawnStore } from './vendor-core.js';
import { type Duration, quote } from './util.js';
import { log } from './log.js';
export { default as path } from 'node:path';
export * as os from 'node:os';
export { log, type LogEntry } from './log.js';
export { chalk, which, ps } from './vendor-core.js';
export { quote, quotePowerShell } from './util.js';
declare const CWD: unique symbol;
declare const SYNC: unique symbol;
export declare function within<R>(callback: () => R): R;
export interface Options {
    [CWD]: string;
    [SYNC]: boolean;
    cwd?: string;
    ac?: AbortController;
    signal?: AbortSignal;
    input?: string | Buffer | Readable | ProcessOutput | ProcessPromise;
    timeout?: Duration;
    timeoutSignal?: NodeJS.Signals;
    stdio: StdioOptions;
    verbose: boolean;
    sync: boolean;
    env: NodeJS.ProcessEnv;
    shell: string | true;
    nothrow: boolean;
    prefix: string;
    postfix: string;
    quote?: typeof quote;
    quiet: boolean;
    detached: boolean;
    preferLocal: boolean | string | string[];
    spawn: typeof spawn;
    spawnSync: typeof spawnSync;
    store?: TSpawnStore;
    log: typeof log;
    kill: typeof kill;
    killSignal?: NodeJS.Signals;
    halt?: boolean;
    delimiter?: string | RegExp;
}
export declare const defaults: Options;
export interface Shell<S = false, R = S extends true ? ProcessOutput : ProcessPromise> {
    (pieces: TemplateStringsArray, ...args: any[]): R;
    <O extends Partial<Options> = Partial<Options>, R = O extends {
        sync: true;
    } ? Shell<true> : Shell>(opts: O): R;
    sync: {
        (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput;
        (opts: Partial<Omit<Options, 'sync'>>): Shell<true>;
    };
}
export declare const $: Shell & Options;
type ProcessStage = 'initial' | 'halted' | 'running' | 'fulfilled' | 'rejected';
type Resolve = (out: ProcessOutput) => void;
type PromisifiedStream<D extends Writable> = D & PromiseLike<ProcessOutput & D>;
type PipeMethod = {
    (dest: TemplateStringsArray, ...args: any[]): ProcessPromise;
    (file: string): PromisifiedStream<Writable>;
    <D extends Writable>(dest: D): PromisifiedStream<D>;
    <D extends ProcessPromise>(dest: D): D;
};
export declare class ProcessPromise extends Promise<ProcessOutput> {
    private _stage;
    private _id;
    private _command;
    private _from;
    private _snapshot;
    private _stdio?;
    private _nothrow?;
    private _quiet?;
    private _verbose?;
    private _timeout?;
    private _timeoutSignal?;
    private _timeoutId?;
    private _piped;
    private _pipedFrom?;
    private _ee;
    private _stdin;
    private _zurk;
    private _output;
    private _reject;
    private _resolve;
    constructor(executor: (resolve: Resolve, reject: Resolve) => void);
    run(): ProcessPromise;
    pipe: PipeMethod & {
        [key in keyof TSpawnStore]: PipeMethod;
    };
    private _pipe;
    abort(reason?: string): void;
    kill(signal?: NodeJS.Signals | undefined): Promise<void>;
    /**
     *  @deprecated Use $({halt: true})`cmd` instead.
     */
    halt(): this;
    get id(): string;
    get pid(): number | undefined;
    get cmd(): string;
    get fullCmd(): string;
    get child(): ChildProcess | undefined;
    get stdin(): Writable;
    get stdout(): Readable;
    get stderr(): Readable;
    get exitCode(): Promise<number | null>;
    get signal(): AbortSignal | undefined;
    get output(): ProcessOutput | null;
    get stage(): ProcessStage;
    get [Symbol.toStringTag](): string;
    [Symbol.toPrimitive](): string;
    stdio(stdin: IOType, stdout?: IOType, stderr?: IOType): ProcessPromise;
    nothrow(v?: boolean): ProcessPromise;
    quiet(v?: boolean): ProcessPromise;
    verbose(v?: boolean): ProcessPromise;
    timeout(d: Duration, signal?: NodeJS.Signals | undefined): ProcessPromise;
    json<T = any>(): Promise<T>;
    text(encoding?: Encoding): Promise<string>;
    lines(delimiter?: string | RegExp): Promise<string[]>;
    buffer(): Promise<Buffer>;
    blob(type?: string): Promise<Blob>;
    isQuiet(): boolean;
    isVerbose(): boolean;
    isNothrow(): boolean;
    isHalted(): boolean;
    private isSettled;
    private isRunning;
    then<R = ProcessOutput, E = ProcessOutput>(onfulfilled?: ((value: ProcessOutput) => PromiseLike<R> | R) | undefined | null, onrejected?: ((reason: ProcessOutput) => PromiseLike<E> | E) | undefined | null): Promise<R | E>;
    catch<T = ProcessOutput>(onrejected?: ((reason: ProcessOutput) => PromiseLike<T> | T) | undefined | null): Promise<ProcessOutput | T>;
    [Symbol.asyncIterator](): AsyncIterator<string>;
    private writable;
    private emit;
    private on;
    private once;
    private write;
    private end;
    private removeListener;
    private static disarm;
}
type ProcessDto = {
    code: number | null;
    signal: NodeJS.Signals | null;
    duration: number;
    error: any;
    from: string;
    store: TSpawnStore;
    delimiter?: string | RegExp;
};
export declare class ProcessOutput extends Error {
    private readonly _dto;
    cause: Error | null;
    message: string;
    stdout: string;
    stderr: string;
    stdall: string;
    constructor(dto: ProcessDto);
    constructor(code: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string, stdall: string, message: string, duration?: number);
    get exitCode(): number | null;
    get signal(): NodeJS.Signals | null;
    get duration(): number;
    get [Symbol.toStringTag](): string;
    get ok(): boolean;
    [Symbol.toPrimitive](): string;
    toString(): string;
    json<T = any>(): T;
    buffer(): Buffer;
    blob(type?: string): Blob;
    text(encoding?: Encoding): string;
    lines(delimiter?: string | RegExp): string[];
    valueOf(): string;
    [Symbol.iterator](): Iterator<string>;
    [inspect.custom](): string;
    static getExitMessage: (code: number | null, signal: NodeJS.Signals | null, stderr: string, from: string, details?: string) => string;
    static getErrorMessage: (err: NodeJS.ErrnoException, from: string) => string;
    static getErrorDetails: (lines?: string[], lim?: number) => string;
    static getExitCodeInfo: (exitCode: number | null) => string | undefined;
}
export declare function usePowerShell(): void;
export declare function usePwsh(): void;
export declare function useBash(): void;
export declare function syncProcessCwd(flag?: boolean): void;
export declare function cd(dir: string | ProcessOutput): void;
export declare function kill(pid: number, signal?: NodeJS.Signals | undefined): Promise<void>;
export declare function resolveDefaults(defs?: Options, prefix?: string, env?: NodeJS.ProcessEnv, allowed?: Set<string>): Options;
