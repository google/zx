// Copyright 2022 Google LLC
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
import chalk from 'chalk';
import { promisify } from 'node:util';
import psTreeModule from 'ps-tree';
export const psTree = promisify(psTreeModule);
export function noop() { }
export function randomId() {
    return Math.random().toString(36).slice(2);
}
export function isString(obj) {
    return typeof obj === 'string';
}
export function quote(arg) {
    if (/^[a-z0-9/_.\-@:=]+$/i.test(arg) || arg === '') {
        return arg;
    }
    return (`$'` +
        arg
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\f/g, '\\f')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\v/g, '\\v')
            .replace(/\0/g, '\\0') +
        `'`);
}
export function quotePowerShell(arg) {
    if (/^[a-z0-9/_.\-]+$/i.test(arg) || arg === '') {
        return arg;
    }
    return `'` + arg.replace(/'/g, "''") + `'`;
}
export function exitCodeInfo(exitCode) {
    return {
        2: 'Misuse of shell builtins',
        126: 'Invoked command cannot execute',
        127: 'Command not found',
        128: 'Invalid exit argument',
        129: 'Hangup',
        130: 'Interrupt',
        131: 'Quit and dump core',
        132: 'Illegal instruction',
        133: 'Trace/breakpoint trap',
        134: 'Process aborted',
        135: 'Bus error: "access to undefined portion of memory object"',
        136: 'Floating point exception: "erroneous arithmetic operation"',
        137: 'Kill (terminate immediately)',
        138: 'User-defined 1',
        139: 'Segmentation violation',
        140: 'User-defined 2',
        141: 'Write to pipe with no one reading',
        142: 'Signal raised by alarm',
        143: 'Termination (request to terminate)',
        145: 'Child process terminated, stopped (or continued*)',
        146: 'Continue if stopped',
        147: 'Stop executing temporarily',
        148: 'Terminal stop signal',
        149: 'Background process attempting to read from tty ("in")',
        150: 'Background process attempting to write to tty ("out")',
        151: 'Urgent data available on socket',
        152: 'CPU time limit exceeded',
        153: 'File size limit exceeded',
        154: 'Signal raised by timer counting virtual time: "virtual timer expired"',
        155: 'Profiling timer expired',
        157: 'Pollable event',
        159: 'Bad syscall',
    }[exitCode || -1];
}
export function errnoMessage(errno) {
    if (errno === undefined) {
        return 'Unknown error';
    }
    return ({
        0: 'Success',
        1: 'Not super-user',
        2: 'No such file or directory',
        3: 'No such process',
        4: 'Interrupted system call',
        5: 'I/O error',
        6: 'No such device or address',
        7: 'Arg list too long',
        8: 'Exec format error',
        9: 'Bad file number',
        10: 'No children',
        11: 'No more processes',
        12: 'Not enough core',
        13: 'Permission denied',
        14: 'Bad address',
        15: 'Block device required',
        16: 'Mount device busy',
        17: 'File exists',
        18: 'Cross-device link',
        19: 'No such device',
        20: 'Not a directory',
        21: 'Is a directory',
        22: 'Invalid argument',
        23: 'Too many open files in system',
        24: 'Too many open files',
        25: 'Not a typewriter',
        26: 'Text file busy',
        27: 'File too large',
        28: 'No space left on device',
        29: 'Illegal seek',
        30: 'Read only file system',
        31: 'Too many links',
        32: 'Broken pipe',
        33: 'Math arg out of domain of func',
        34: 'Math result not representable',
        35: 'File locking deadlock error',
        36: 'File or path name too long',
        37: 'No record locks available',
        38: 'Function not implemented',
        39: 'Directory not empty',
        40: 'Too many symbolic links',
        42: 'No message of desired type',
        43: 'Identifier removed',
        44: 'Channel number out of range',
        45: 'Level 2 not synchronized',
        46: 'Level 3 halted',
        47: 'Level 3 reset',
        48: 'Link number out of range',
        49: 'Protocol driver not attached',
        50: 'No CSI structure available',
        51: 'Level 2 halted',
        52: 'Invalid exchange',
        53: 'Invalid request descriptor',
        54: 'Exchange full',
        55: 'No anode',
        56: 'Invalid request code',
        57: 'Invalid slot',
        59: 'Bad font file fmt',
        60: 'Device not a stream',
        61: 'No data (for no delay io)',
        62: 'Timer expired',
        63: 'Out of streams resources',
        64: 'Machine is not on the network',
        65: 'Package not installed',
        66: 'The object is remote',
        67: 'The link has been severed',
        68: 'Advertise error',
        69: 'Srmount error',
        70: 'Communication error on send',
        71: 'Protocol error',
        72: 'Multihop attempted',
        73: 'Cross mount point (not really error)',
        74: 'Trying to read unreadable message',
        75: 'Value too large for defined data type',
        76: 'Given log. name not unique',
        77: 'f.d. invalid for this operation',
        78: 'Remote address changed',
        79: 'Can   access a needed shared lib',
        80: 'Accessing a corrupted shared lib',
        81: '.lib section in a.out corrupted',
        82: 'Attempting to link in too many libs',
        83: 'Attempting to exec a shared library',
        84: 'Illegal byte sequence',
        86: 'Streams pipe error',
        87: 'Too many users',
        88: 'Socket operation on non-socket',
        89: 'Destination address required',
        90: 'Message too long',
        91: 'Protocol wrong type for socket',
        92: 'Protocol not available',
        93: 'Unknown protocol',
        94: 'Socket type not supported',
        95: 'Not supported',
        96: 'Protocol family not supported',
        97: 'Address family not supported by protocol family',
        98: 'Address already in use',
        99: 'Address not available',
        100: 'Network interface is not configured',
        101: 'Network is unreachable',
        102: 'Connection reset by network',
        103: 'Connection aborted',
        104: 'Connection reset by peer',
        105: 'No buffer space available',
        106: 'Socket is already connected',
        107: 'Socket is not connected',
        108: "Can't send after socket shutdown",
        109: 'Too many references',
        110: 'Connection timed out',
        111: 'Connection refused',
        112: 'Host is down',
        113: 'Host is unreachable',
        114: 'Socket already connected',
        115: 'Connection already in progress',
        116: 'Stale file handle',
        122: 'Quota exceeded',
        123: 'No medium (in tape drive)',
        125: 'Operation canceled',
        130: 'Previous owner died',
        131: 'State not recoverable',
    }[-errno] || 'Unknown error');
}
export function parseDuration(d) {
    if (typeof d == 'number') {
        if (isNaN(d) || d < 0)
            throw new Error(`Invalid duration: "${d}".`);
        return d;
    }
    else if (/\d+s/.test(d)) {
        return +d.slice(0, -1) * 1000;
    }
    else if (/\d+ms/.test(d)) {
        return +d.slice(0, -2);
    }
    throw new Error(`Unknown duration: "${d}".`);
}
export function formatCmd(cmd) {
    if (cmd == undefined)
        return chalk.grey('undefined');
    const chars = [...cmd];
    let out = '$ ';
    let buf = '';
    let ch;
    let state = root;
    let wordCount = 0;
    while (state) {
        ch = chars.shift() || 'EOF';
        if (ch == '\n') {
            out += style(state, buf) + '\n> ';
            buf = '';
            continue;
        }
        const next = ch == 'EOF' ? undefined : state();
        if (next != state) {
            out += style(state, buf);
            buf = '';
        }
        state = next == root ? next() : next;
        buf += ch;
    }
    function style(state, s) {
        if (s == '')
            return '';
        if (reservedWords.includes(s)) {
            return chalk.cyanBright(s);
        }
        if (state == word && wordCount == 0) {
            wordCount++;
            return chalk.greenBright(s);
        }
        if (state == syntax) {
            wordCount = 0;
            return chalk.cyanBright(s);
        }
        if (state == dollar)
            return chalk.yellowBright(s);
        if (state?.name.startsWith('str'))
            return chalk.yellowBright(s);
        return s;
    }
    function isSyntax(ch) {
        return '()[]{}<>;:+|&='.includes(ch);
    }
    function root() {
        if (/\s/.test(ch))
            return space;
        if (isSyntax(ch))
            return syntax;
        if (/[$]/.test(ch))
            return dollar;
        if (/["]/.test(ch))
            return strDouble;
        if (/[']/.test(ch))
            return strSingle;
        return word;
    }
    function space() {
        if (/\s/.test(ch))
            return space;
        return root;
    }
    function word() {
        if (/[0-9a-z/_.]/i.test(ch))
            return word;
        return root;
    }
    function syntax() {
        if (isSyntax(ch))
            return syntax;
        return root;
    }
    function dollar() {
        if (/[']/.test(ch))
            return str;
        return root;
    }
    function str() {
        if (/[']/.test(ch))
            return strEnd;
        if (/[\\]/.test(ch))
            return strBackslash;
        return str;
    }
    function strBackslash() {
        return strEscape;
    }
    function strEscape() {
        return str;
    }
    function strDouble() {
        if (/["]/.test(ch))
            return strEnd;
        return strDouble;
    }
    function strSingle() {
        if (/[']/.test(ch))
            return strEnd;
        return strSingle;
    }
    function strEnd() {
        return root;
    }
    return out + '\n';
}
const reservedWords = [
    'if',
    'then',
    'else',
    'elif',
    'fi',
    'case',
    'esac',
    'for',
    'select',
    'while',
    'until',
    'do',
    'done',
    'in',
];
