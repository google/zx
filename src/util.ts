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

import path from 'node:path'
import { type Buffer } from 'node:buffer'
import process from 'node:process'
import { type TSpawnStore } from './vendor-core.ts'

export { isStringLiteral } from './vendor-core.ts'

export function noop() {}

export function identity<T>(v: T): T {
  return v
}

export function randomId() {
  return Math.random().toString(36).slice(2)
}

export function isString(obj: any) {
  return typeof obj === 'string'
}

const utf8Decoder = new TextDecoder('utf-8')
export const bufToString = (buf: Buffer | string): string =>
  isString(buf) ? buf : utf8Decoder.decode(buf)

export const bufArrJoin = (arr: TSpawnStore[keyof TSpawnStore]): string =>
  arr.reduce((acc, buf) => acc + bufToString(buf), '')

export const getLast = <T>(arr: { length: number; [i: number]: any }): T =>
  arr[arr.length - 1]

export function preferLocalBin(
  env: NodeJS.ProcessEnv,
  ...dirs: (string | undefined)[]
) {
  const pathKey =
    process.platform === 'win32'
      ? Object.keys(env)
          .reverse()
          .find((key) => key.toUpperCase() === 'PATH') || 'Path'
      : 'PATH'
  const pathValue = dirs
    .map(
      (c) =>
        c && [
          path.resolve(c as string, 'node_modules', '.bin'),
          path.resolve(c as string),
        ]
    )
    .flat()
    .concat(env[pathKey])
    .filter(Boolean)
    .join(path.delimiter)

  return {
    ...env,
    [pathKey]: pathValue,
  }
}

export function quote(arg: string): string {
  if (arg === '') return `$''`
  if (/^[\w/.\-@:=]+$/.test(arg)) return arg

  return (
    `$'` +
    arg
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\f/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0') +
    `'`
  )
}

export function quotePowerShell(arg: string): string {
  if (arg === '') return `''`
  if (/^[\w/.\-]+$/.test(arg)) return arg

  return `'` + arg.replace(/'/g, "''") + `'`
}

export type Duration =
  | number
  | `${number}`
  | `${number}m`
  | `${number}s`
  | `${number}ms`

export function parseDuration(d: Duration) {
  if (typeof d === 'number') {
    if (isNaN(d) || d < 0) throw new Error(`Invalid duration: "${d}".`)
    return d
  }
  const [m, v, u] = d.match(/^(\d+)(m?s?)$/) || []
  if (!m) throw new Error(`Unknown duration: "${d}".`)

  return +v * ({ s: 1000, ms: 1, m: 60_000 }[u] || 1)
}

export const once = <T extends (...args: any[]) => any>(fn: T) => {
  let called = false
  let result: ReturnType<T>

  return (...args: Parameters<T>): ReturnType<T> =>
    called ? result : ((called = true), (result = fn(...args)))
}

export const proxyOverride = <T extends object>(
  origin: T,
  ...fallbacks: any
): T =>
  new Proxy(origin, {
    get(target: any, key) {
      return (
        fallbacks.find((f: any) => key in f)?.[key] ?? Reflect.get(target, key)
      )
    },
  }) as T

export const toCamelCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/([a-z])[_-]+([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())

export const parseBool = (v: string): boolean | string =>
  v === 'true' || (v !== 'false' && v)

export const getLines = (
  chunk: Buffer | string,
  next: (string | undefined)[],
  delimiter: string | RegExp
) => {
  const lines = ((next.pop() || '') + bufToString(chunk)).split(delimiter)
  next.push(lines.pop())
  return lines
}

export const iteratorToArray = <T>(it: Iterator<T>): T[] => {
  const arr = []
  let entry
  while (!(entry = it.next()).done) arr.push(entry.value)
  return arr
}
