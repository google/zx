/// <reference types="minimist" />
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="which" />
import * as _ from './index.js';
declare global {
    type ProcessPromise = _.ProcessPromise;
    type ProcessOutput = _.ProcessOutput;
    var ProcessPromise: typeof _.ProcessPromise;
    var ProcessOutput: typeof _.ProcessOutput;
    var log: typeof _.log;
    var $: typeof _.$;
    var argv: typeof _.argv;
    var cd: typeof _.cd;
    var chalk: typeof _.chalk;
    var echo: typeof _.echo;
    var expBackoff: typeof _.expBackoff;
    var fs: typeof _.fs;
    var glob: typeof _.glob;
    var globby: typeof _.globby;
    var minimist: typeof _.minimist;
    var nothrow: typeof _.nothrow;
    var os: typeof _.os;
    var path: typeof _.path;
    var question: typeof _.question;
    var quiet: typeof _.quiet;
    var quote: typeof _.quote;
    var quotePowerShell: typeof _.quotePowerShell;
    var retry: typeof _.retry;
    var sleep: typeof _.sleep;
    var spinner: typeof _.spinner;
    var ssh: typeof _.ssh;
    var stdin: typeof _.stdin;
    var which: typeof _.which;
    var within: typeof _.within;
    var YAML: typeof _.YAML;
}
