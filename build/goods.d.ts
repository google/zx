import { type Duration } from './util.js';
import { type RequestInfo, type RequestInit, minimist } from './vendor.js';
type ArgvOpts = minimist.Opts & {
    camelCase?: boolean;
    parseBoolean?: boolean;
};
export declare const parseArgv: (args?: string[], opts?: ArgvOpts, defs?: Record<string, any>) => minimist.ParsedArgs;
export declare function updateArgv(args?: string[], opts?: ArgvOpts): void;
export declare const argv: minimist.ParsedArgs;
export declare function sleep(duration: Duration): Promise<void>;
export declare function fetch(url: RequestInfo, init?: RequestInit): Promise<Response> & {
    pipe: <D>(dest: D) => D;
};
export declare function echo(...args: any[]): void;
export declare function question(query?: string, options?: {
    choices: string[];
}): Promise<string>;
export declare function stdin(): Promise<string>;
export declare function retry<T>(count: number, callback: () => T): Promise<T>;
export declare function retry<T>(count: number, duration: Duration | Generator<number>, callback: () => T): Promise<T>;
export declare function expBackoff(max?: Duration, rand?: Duration): Generator<number, void, unknown>;
export declare function spinner<T>(callback: () => T): Promise<T>;
export declare function spinner<T>(title: string, callback: () => T): Promise<T>;
export {};
