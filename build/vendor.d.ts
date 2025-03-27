/// <reference types="node" />
/// <reference types="fs-extra" />

import { depseek as _depseek, dotenv as _dotenv, type minimist as TMinimistNamespace, minimist as _minimist, fs as _fs, YAML as _YAML, glob as _glob, nodeFetch as _nodeFetch } from './vendor-extra.js';
export * from './vendor-core.js';
export { createRequire } from './vendor-extra.js';
export declare const depseek: typeof _depseek;
export declare const dotenv: typeof _dotenv;
export declare const fs: typeof _fs;
export declare const YAML: typeof _YAML;
export declare const glob: typeof _glob;
export declare const nodeFetch: typeof _nodeFetch;
export declare const minimist: typeof _minimist;
export declare namespace minimist {
    type Opts = TMinimistNamespace.Opts;
    type ParsedArgs = TMinimistNamespace.ParsedArgs;
}
