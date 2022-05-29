import { strict } from 'assert'

let p = $`while true; do :; done`
setTimeout(() => p.kill('SIGKILL'), 100)
let signal

try {
  await p
} catch (p) {
  signal = p.signal
}

strict.equal(signal, 'SIGKILL')
