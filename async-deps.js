module.exports = (async () => {
  const globbyModule = await import('globby')
  return {globbyModule}
})()
