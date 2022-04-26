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

import {AsyncLocalStorage} from 'node:async_hooks'

let root

export const als = new AsyncLocalStorage()
export const boundCtx = Symbol('AsyncLocalStorage bound ctx')
export const getCtx = () => als.getStore()
export const setRootCtx = (ctx) => { als.enterWith(ctx); root = ctx }
export const getRootCtx = () => root
export const runInCtx = (ctx, cb) => als.run(ctx, cb)
