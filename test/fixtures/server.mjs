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

import net from 'node:net'

export const fakeServer = (data = []) => {
  const server = net.createServer()
  server.on('connection', (conn) => {
    conn.on('data', () => {
      const d = data.shift() || 'pong'
      const _d = d.toString('utf-8').split(/\r?\n/).join('\r\n')
      conn.write(_d)
    })
  })
  server.stop = () => new Promise((resolve) => server.close(() => resolve()))
  server.start = async (port) => {
    const p = port || (await (await import('get-port')).getPort())
    server.url = `http://127.0.0.1:${p}`
    return new Promise((resolve) => server.listen(p, () => resolve(server)))
  }

  return server
}
