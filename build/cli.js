#!/usr/bin/env node
// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import fs from 'fs-extra';
import minimist from 'minimist';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import url from 'node:url';
import { updateArgv } from './goods.js';
import { $, chalk, fetch, ProcessOutput } from './index.js';
import { startRepl } from './repl.js';
import { randomId } from './util.js';
import { installDeps, parseDeps } from './deps.js';
function printUsage() {
    // language=txt
    console.log(`
 ${chalk.bold('zx ' + getVersion())}
   A tool for writing better scripts

 ${chalk.bold('Usage')}
   zx [options] <script>

 ${chalk.bold('Options')}
   --quiet              don't echo commands
   --shell=<path>       custom shell binary
   --prefix=<command>   prefix all commands
   --eval=<js>, -e      evaluate script 
   --install, -i        install dependencies
   --experimental       enable experimental features
   --version, -v        print current zx version
   --help, -h           print help
   --repl               start repl
`);
}
const argv = minimist(process.argv.slice(2), {
    string: ['shell', 'prefix', 'eval'],
    boolean: ['version', 'help', 'quiet', 'install', 'repl', 'experimental'],
    alias: { e: 'eval', i: 'install', v: 'version', h: 'help' },
    stopEarly: true,
});
await (async function main() {
    const globals = './globals.js';
    await import(globals);
    if (argv.quiet)
        $.verbose = false;
    if (argv.shell)
        $.shell = argv.shell;
    if (argv.prefix)
        $.prefix = argv.prefix;
    if (argv.experimental) {
        Object.assign(global, await import('./experimental.js'));
    }
    if (argv.version) {
        console.log(getVersion());
        return;
    }
    if (argv.help) {
        printUsage();
        return;
    }
    if (argv.repl) {
        startRepl();
        return;
    }
    if (argv.eval) {
        await runScript(argv.eval);
        return;
    }
    const firstArg = argv._[0];
    updateArgv(argv._.slice(firstArg === undefined ? 0 : 1));
    if (!firstArg || firstArg === '-') {
        const success = await scriptFromStdin();
        if (!success)
            printUsage();
        return;
    }
    if (/^https?:/.test(firstArg)) {
        await scriptFromHttp(firstArg);
        return;
    }
    const filepath = firstArg.startsWith('file:///')
        ? url.fileURLToPath(firstArg)
        : resolve(firstArg);
    await importPath(filepath);
})().catch((err) => {
    if (err instanceof ProcessOutput) {
        console.error('Error:', err.message);
    }
    else {
        console.error(err);
    }
    process.exitCode = 1;
});
async function runScript(script) {
    const filepath = join(process.cwd(), `zx-${randomId()}.mjs`);
    await writeAndImport(script, filepath);
}
async function scriptFromStdin() {
    let script = '';
    if (!process.stdin.isTTY) {
        process.stdin.setEncoding('utf8');
        for await (const chunk of process.stdin) {
            script += chunk;
        }
        if (script.length > 0) {
            await runScript(script);
            return true;
        }
    }
    return false;
}
async function scriptFromHttp(remote) {
    const res = await fetch(remote);
    if (!res.ok) {
        console.error(`Error: Can't get ${remote}`);
        process.exit(1);
    }
    const script = await res.text();
    const pathname = new URL(remote).pathname;
    const name = basename(pathname);
    const ext = extname(pathname) || '.mjs';
    const filepath = join(process.cwd(), `${name}-${randomId()}${ext}`);
    await writeAndImport(script, filepath);
}
async function writeAndImport(script, filepath, origin = filepath) {
    await fs.writeFile(filepath, script.toString());
    try {
        await importPath(filepath, origin);
    }
    finally {
        await fs.rm(filepath);
    }
}
async function importPath(filepath, origin = filepath) {
    const ext = extname(filepath);
    if (ext === '') {
        const tmpFilename = fs.existsSync(`${filepath}.mjs`)
            ? `${basename(filepath)}-${randomId()}.mjs`
            : `${basename(filepath)}.mjs`;
        return writeAndImport(await fs.readFile(filepath), join(dirname(filepath), tmpFilename), origin);
    }
    if (ext === '.md') {
        return writeAndImport(transformMarkdown(await fs.readFile(filepath)), join(dirname(filepath), basename(filepath) + '.mjs'), origin);
    }
    if (argv.install) {
        const deps = parseDeps(await fs.readFile(filepath));
        await installDeps(deps, dirname(filepath));
    }
    const __filename = resolve(origin);
    const __dirname = dirname(__filename);
    const require = createRequire(origin);
    Object.assign(global, { __filename, __dirname, require });
    await import(url.pathToFileURL(filepath).toString());
}
function transformMarkdown(buf) {
    const source = buf.toString();
    const output = [];
    let state = 'root';
    let codeBlockEnd = '';
    let prevLineIsEmpty = true;
    const jsCodeBlock = /^(```+|~~~+)(js|javascript)$/;
    const shCodeBlock = /^(```+|~~~+)(sh|bash)$/;
    const otherCodeBlock = /^(```+|~~~+)(.*)$/;
    for (let line of source.split('\n')) {
        switch (state) {
            case 'root':
                if (/^( {4}|\t)/.test(line) && prevLineIsEmpty) {
                    output.push(line);
                    state = 'tab';
                }
                else if (jsCodeBlock.test(line)) {
                    output.push('');
                    state = 'js';
                    codeBlockEnd = line.match(jsCodeBlock)[1];
                }
                else if (shCodeBlock.test(line)) {
                    output.push('await $`');
                    state = 'bash';
                    codeBlockEnd = line.match(shCodeBlock)[1];
                }
                else if (otherCodeBlock.test(line)) {
                    output.push('');
                    state = 'other';
                    codeBlockEnd = line.match(otherCodeBlock)[1];
                }
                else {
                    prevLineIsEmpty = line === '';
                    output.push('// ' + line);
                }
                break;
            case 'tab':
                if (/^( +|\t)/.test(line)) {
                    output.push(line);
                }
                else if (line === '') {
                    output.push('');
                }
                else {
                    output.push('// ' + line);
                    state = 'root';
                }
                break;
            case 'js':
                if (line === codeBlockEnd) {
                    output.push('');
                    state = 'root';
                }
                else {
                    output.push(line);
                }
                break;
            case 'bash':
                if (line === codeBlockEnd) {
                    output.push('`');
                    state = 'root';
                }
                else {
                    output.push(line);
                }
                break;
            case 'other':
                if (line === codeBlockEnd) {
                    output.push('');
                    state = 'root';
                }
                else {
                    output.push('// ' + line);
                }
                break;
        }
    }
    return output.join('\n');
}
function getVersion() {
    return createRequire(import.meta.url)('../package.json').version;
}
