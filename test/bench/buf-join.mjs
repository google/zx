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

import cronometro from 'cronometro'

const STR = 'a'.repeat(1024)
const BUF = Buffer.from(STR)
const BUF_ARR = new Array(128).fill(null).map(() => Buffer.from(STR))
const STR_ARR = new Array(128).fill(STR)

const decoder = new TextDecoder()
cronometro({
  buf_arr_map_decode_join() {
    BUF_ARR.map(decoder.decode.bind(decoder)).join('')
  },
  buf_arr_reduce_decode() {
    BUF_ARR.reduce((acc, buf) => acc + decoder.decode(buf), '')
  },
  buf_arr_reduce_to_string() {
    BUF_ARR.reduce((acc, buf) => acc + buf.toString('utf8'), '')
  },
  buf_arr_for_decode() {
    let res = ''
    for (const buf of BUF_ARR) {
      res += decoder.decode(buf)
    }
  },
  buf_arr_while_decode() {
    let res = ''
    let i = 0
    const bl = BUF_ARR.length
    while (i < bl) {
      res += decoder.decode(BUF_ARR[i])
      i++
    }
  },
  buf_arr_join() {
    BUF_ARR.join('')
  },
  buf_arr_concat_decode() {
    decoder.decode(Buffer.concat(BUF_ARR))
  },
  str_arr_join() {
    STR_ARR.join('')
  },
  str_arr_reduce() {
    STR_ARR.reduce((acc, buf) => acc + buf, '')
  },
})
