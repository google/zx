import {basename, dirname, extname, join, parse, resolve} from 'path'
import {tmpdir} from 'os'
import fs from 'fs-extra'
import {createRequire} from 'module'
import url from 'url'
import {$, fetch} from './index.mjs'

export async function scriptFromStdin() {
  let script = ''
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      script += chunk
    }

    if (script.length > 0) {
      let filepath = join(
        tmpdir(),
        Math.random().toString(36).substr(2) + '.mjs'
      )
      await fs.mkdtemp(filepath)
      await writeAndImport(script, filepath, join(process.cwd(), 'stdin.mjs'))
      return true
    }
  }
  return false
}

export async function scriptFromHttp(remote) {
  let res = await fetch(remote)
  if (!res.ok) {
    console.error(`Error: Can't get ${remote}`)
    process.exit(1)
  }
  let script = await res.text()
  let filename = new URL(remote).pathname
  let filepath = join(tmpdir(), basename(filename))
  await fs.mkdtemp(filepath)
  await writeAndImport(script, filepath, join(process.cwd(), basename(filename)))
}

export async function writeAndImport(script, filepath, origin = filepath) {
  await fs.writeFile(filepath, script)
  let wait = importPath(filepath, origin)
  await fs.rm(filepath)
  await wait
}

export async function importPath(filepath, origin = filepath) {
  let ext = extname(filepath)
  if (ext === '') {
    return await writeAndImport(
      await fs.readFile(filepath),
      join(dirname(filepath), basename(filepath) + '.mjs'),
      origin,
    )
  }
  if (ext === '.md') {
    return await writeAndImport(
      transformMarkdown((await fs.readFile(filepath)).toString()),
      join(dirname(filepath), basename(filepath) + '.mjs'),
      origin,
    )
  }
  if (ext === '.ts') {
    let {dir, name} = parse(filepath)
    let outFile = join(dir, name + '.cjs')
    await compile(filepath)
    await fs.rename(join(dir, name + '.js'), outFile)
    let wait = importPath(outFile, filepath)
    await fs.rm(outFile)
    return wait
  }
  let __filename = resolve(origin)
  let __dirname = dirname(__filename)
  let require = createRequire(origin)
  Object.assign(global, {__filename, __dirname, require})
  await import(url.pathToFileURL(filepath))
}

export function transformMarkdown(source) {
  let output = []
  let state = 'root'
  let prevLineIsEmpty = true
  for (let line of source.split('\n')) {
    switch (state) {
      case 'root':
        if (/^( {4}|\t)/.test(line) && prevLineIsEmpty) {
          output.push(line)
          state = 'tab'
        } else if (/^```(js|javascript)$/.test(line)) {
          output.push('')
          state = 'js'
        } else if (/^```(sh|bash)$/.test(line)) {
          output.push('await $`')
          state = 'bash'
        } else if (/^```.*$/.test(line)) {
          output.push('')
          state = 'other'
        } else {
          prevLineIsEmpty = line === ''
          output.push('// ' + line)
        }
        break
      case 'tab':
        if (/^( +|\t)/.test(line)) {
          output.push(line)
        } else if (line === '') {
          output.push('')
        } else {
          output.push('// ' + line)
          state = 'root'
        }
        break
      case 'js':
        if (/^```$/.test(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'bash':
        if (/^```$/.test(line)) {
          output.push('`')
          state = 'root'
        } else {
          output.push(line)
        }
        break
      case 'other':
        if (/^```$/.test(line)) {
          output.push('')
          state = 'root'
        } else {
          output.push('// ' + line)
        }
        break
    }
  }
  return output.join('\n')
}

export async function compile(input) {
  let v = $.verbose
  $.verbose = false
  let tsc = $`npm_config_yes=true npx -p typescript tsc --target esnext --lib esnext --module commonjs --moduleResolution node ${input}`
  $.verbose = v
  let i = 0,
    spinner = setInterval(() => process.stdout.write(`  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i++ % 10]}\r`), 100)
  try {
    await tsc
  } catch (err) {
    console.error(err.toString())
    process.exit(1)
  }
  clearInterval(spinner)
  process.stdout.write('   \r')
}
