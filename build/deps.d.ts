/**
 * Install npm dependencies
 * @param dependencies object of dependencies
 * @param prefix  path to the directory where npm should install the dependencies
 * @param registry custom npm registry URL when installing dependencies
 */
export declare function installDeps(dependencies: Record<string, string>, prefix?: string, registry?: string): Promise<void>;
export declare function parseDeps(content: string): Record<string, string>;
