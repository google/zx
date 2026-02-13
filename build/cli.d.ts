#!/usr/bin/env node
import { type minimist } from './vendor.js';
export { transformMarkdown } from './md.js';
export { isMain } from './util.js';
export declare const argv: minimist.ParsedArgs;
export declare function printUsage(): void;
export declare function main(): Promise<void>;
export declare function injectGlobalRequire(origin: string): void;
export declare function normalizeExt(ext?: string): string | undefined;
