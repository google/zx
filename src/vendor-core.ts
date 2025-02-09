// Copyright 2024 Google LLC
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

import { default as _chalk } from 'chalk'
import { default as _which } from 'which'
import { default as _ps } from '@webpod/ps'

type TCallable = (...args: any[]) => any
const store = new Map<string, any>()
const override = store.set.bind(store)
const wrap = <T extends object>(name: string, api: T): T => {
  override(name, api)
  return new Proxy<T>(api, {
    get(_, key) {
      return store.get(name)[key]
    },
    apply(_, self, args) {
      return (store.get(name) as TCallable).apply(self, args)
    },
  })
}
export const bus = {
  override,
  store,
  wrap,
}

export {
  type TSpawnStore,
  type TSpawnStoreChunks,
  exec,
  buildCmd,
  isStringLiteral,
  VoidStream,
} from 'zurk/spawn'

export type RequestInfo = Parameters<typeof globalThis.fetch>[0]
export type RequestInit = Parameters<typeof globalThis.fetch>[1]

export { type ChalkInstance } from 'chalk'
export const chalk: typeof _chalk = wrap('chalk', _chalk)
export const which: typeof _which = wrap('which', _which)
export const ps: typeof _ps = wrap('ps', _ps)
