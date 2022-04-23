import {AsyncLocalStorage} from "node:async_hooks";

export const als = new AsyncLocalStorage()
export const boundCtx = Symbol('AsyncLocalStorage bound ctx')
