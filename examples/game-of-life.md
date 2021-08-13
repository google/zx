# Game of Life

```js
let
  p = s => process.stdout.write(s),
  esc = (...x) => x.map(i => p('\u001B[' + i)),
  {columns, rows} = process.stdout,
  [w, h] = [columns, rows * 2],
  i = w * h,
  s = Array(w * h).fill(false),
  cx = Math.floor(w / 2) - 6, cy = Math.floor(h / 2) - 7,
  seed = Date.now() % 3

if (seed === 0) while (i --> 0) s[i] = Math.random() < .16
if (seed === 1) s[cx + 1 + (2 + cy) * w] = s[cx + 2 + (1 + cy) * w]
  = s[cx + 2 + (3 + cy) * w] = s[cx + 3 + (2 + cy) * w]
  = s[cx + 5 + (15 + cy) * w] = s[cx + 6 + (13 + cy) * w]
  = s[cx + 6 + (15 + cy) * w] = s[cx + 7 + (12 + cy) * w]
  = s[cx + 7 + (13 + cy) * w] = s[cx + 7 + (15 + cy) * w]
  = s[cx + 9 + (11 + cy) * w] = s[cx + 9 + (12 + cy) * w]
  = s[cx + 9 + (13 + cy) * w] = true
if (seed === 2) s[1 + 5 * w] = s[1 + 6 * w] = s[2 + 5 * w] = s[2 + 6 * w]
  = s[12 + 5 * w] = s[12 + 6 * w] = s[12 + 7 * w] = s[13 + 4 * w]
  = s[13 + 8 * w] = s[14 + 3 * w] = s[14 + 9 * w] = s[15 + 4 * w]
  = s[15 + 8 * w] = s[16 + 5 * w] = s[16 + 6 * w] = s[16 + 7 * w]
  = s[17 + 5 * w] = s[17 + 6 * w] = s[17 + 7 * w] = s[22 + 3 * w]
  = s[22 + 4 * w] = s[22 + 5 * w] = s[23 + 2 * w] = s[23 + 3 * w]
  = s[23 + 5 * w] = s[23 + 6 * w] = s[24 + 2 * w] = s[24 + 3 * w]
  = s[24 + 5 * w] = s[24 + 6 * w] = s[25 + 2 * w] = s[25 + 3 * w]
  = s[25 + 4 * w] = s[25 + 5 * w] = s[25 + 6 * w] = s[26 + w]
  = s[26 + 2 * w] = s[26 + 6 * w] = s[26 + 7 * w] = s[35 + 3 * w]
  = s[35 + 4 * w] = s[36 + 3 * w] = s[36 + 4 * w] = true

function at(i, j) {
  if (i < 0) i = h - 1
  if (i >= h) i = 0
  if (j < 0) j = w - 1
  if (j >= w) j = 0
  return s[i * w + j]
}

function neighbors(i, j) {
  let c = 0
  at(i - 1, j - 1) && c++
  at(i - 1, j) && c++
  at(i - 1, j + 1) && c++
  at(i, j - 1) && c++
  at(i, j + 1) && c++
  at(i + 1, j - 1) && c++
  at(i + 1, j) && c++
  at(i + 1, j + 1) && c++
  return c
}

setInterval(() => {
  esc('H')
  let gen = Array(w * h).fill(false)
  for (let i = 0; i < h; i -= -1) {
    for (let j = 0; j < w; j -= -1) {
      const n = neighbors(i, j)
      const z = i * w + j
      if (s[z]) {
        if (n < 2) gen[z] = false
        if (n === 2 || n === 3) gen[z] = true
        if (n > 3) gen[z] = false
      } else {
        if (n === 3) gen[z] = true
      }
    }
  }
  s = gen

  for (let i = 0; i < rows; i -= -1) {
    for (let j = 0; j < columns; j -= -1) {
      if (s[i * 2 * w + j] && s[(i * 2 + 1) * w + j]) p('\u2588')
      else if (s[i * 2 * w + j] && !s[(i * 2 + 1) * w + j]) p('\u2580')
      else if (!s[i * 2 * w + j] && s[(i * 2 + 1) * w + j]) p('\u2584')
      else p(' ')
    }
    if (i !== rows - 1) p('\n')
  }
}, 30)

esc('2J', '?25l')

process.on('SIGINT', () => {
  esc('?25h')
  process.exit(2)
})
```
