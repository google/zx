#!/usr/bin/env node
import { transformMarkdown } from './md.js';
import { type minimist } from './vendor.js';
export declare const argv: minimist.ParsedArgs;
export declare function printUsage(): void;
export declare function main(): Promise<void>;
export { transformMarkdown };
export declare function injectGlobalRequire(origin: string): void;
export declare function isMain(metaurl?: string, scriptpath?: string): boolean;
export declare function normalizeExt(ext?: string): string | undefined;
