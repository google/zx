import { ProcessPromise } from './core.js';
export * from './core.js';
export * from './goods.js';
export { Duration, quote, quotePowerShell } from './util.js';
/**
 *  @deprecated Use $.nothrow() instead.
 */
export declare function nothrow(promise: ProcessPromise): ProcessPromise;
/**
 * @deprecated Use $.quiet() instead.
 */
export declare function quiet(promise: ProcessPromise): ProcessPromise;
