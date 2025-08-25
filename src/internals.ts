// Copyright 2025 Google LLC
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

type TCallable = (...args: any[]) => any

let locked = false
const lock: () => void = () => (locked = true)

const store: Map<string, any> = new Map()
const override: (typeof store)['set'] = store.set.bind(store)
function wrap<T extends object>(name: string, api: T): T {
  if (locked) throw new Error('bus is locked')
  override(name, api)
  return new Proxy<T>(api, {
    get(_, key) {
      return store.get(name)[key] || store.get(name)?.default?.[key]
    },
    apply(_, self, args) {
      return (store.get(name) as TCallable).apply(self, args)
    },
  })
}

/**
 * @internal
 * @private
 * @protected
 */
export const bus = {
  override,
  wrap,
  lock,
}
