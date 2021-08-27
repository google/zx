let {$} = require('..')

void async function () {
  await $`echo Hello from CommonJS!`
}()
