/// <reference types="node" resolution-mode="require"/>
export declare function installDeps(dependencies: Record<string, string>, prefix?: string): Promise<void>;
export declare function parseDeps(content: Buffer): Record<string, string>;
