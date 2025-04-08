import { type RequestInfo, type RequestInit } from './vendor-core.js';
import { type Buffer } from 'node:buffer';
export type LogEntry = {
    verbose?: boolean;
} & ({
    kind: 'cmd';
    cmd: string;
    id: string;
} | {
    kind: 'stdout';
    data: Buffer;
    id: string;
} | {
    kind: 'stderr';
    data: Buffer;
    id: string;
} | {
    kind: 'end';
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    duration: number;
    error: null | Error;
    id: string;
} | {
    kind: 'cd';
    dir: string;
} | {
    kind: 'fetch';
    url: RequestInfo;
    init?: RequestInit;
} | {
    kind: 'retry';
    attempt: number;
    total: number;
    delay: number;
    exception: unknown;
    error?: string;
} | {
    kind: 'custom';
    data: any;
});
type LogFormatters = {
    [key in LogEntry['kind']]: (entry: Extract<LogEntry, {
        kind: key;
    }>) => string | Buffer;
};
type Log = {
    (entry: LogEntry): void;
    formatters?: Partial<LogFormatters>;
    output?: NodeJS.WriteStream;
};
export declare const log: Log;
export declare function formatCmd(cmd: string): string;
export {};
