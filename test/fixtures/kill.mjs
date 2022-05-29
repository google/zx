let p = nothrow($`sleep 9999`)
setTimeout(() => {
  p.kill()
}, 100)
await p
