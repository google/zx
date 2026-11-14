<h1><img src="https://google.github.io/zx/img/logo.svg" alt="Zx logo" height="32" width="28" valign="middle"> zx</h1>

[ [English](https://github.com/google/zx/blob/main/README.md) | 简体中文 ]

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

const branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

const name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash 非常强大，但当需要编写更复杂的脚本时，许多人更倾向于使用更顺手的现代编程语言。JavaScript 是一个绝佳的选择，但 Node.js 标准库在使用前往往需要繁琐的封装与配置。无需妥协，兼采二者之长 —— `zx` 软件包针对 `child_process` 提供了实用的跨平台封装，自动对命令行参数进行转义，并提供贴心合理的默认配置。

## 安装 (Install)

```bash
npm install zx
```

完整安装与配置选项请参阅：[zx/setup](https://google.github.io/zx/setup)。
另请参阅轻量版本 [**zx@lite**](https://google.github.io/zx/lite)。

## 使用指南 (Usage)

* [官方完整文档 (google.github.io/zx/)](https://google.github.io/zx/)
* [代码示例集 (examples)](https://github.com/google/zx/tree/main/examples)

## 兼容性 (Compatibility)

* Linux、macOS 或 Windows
* JavaScript 运行时：
    * Node.js >= 12.20.0
    * Bun >= 1.0.0
    * Deno 1.x, 2.x
    * GraalVM Node.js
    * Electron >= 11
* 支持 [Bash 或 PowerShell](https://google.github.io/zx/shell)
* 支持在 [JS 或 TS](https://google.github.io/zx/typescript) 中使用 [CJS 或 ESM](https://google.github.io/zx/setup#hybrid) 模块

## 相关链接 (See also)

- [Ant](https://github.com/ant-src/ant) —— 类似 TypeScript 语法、具备 Goroutine 风格高并发的轻量级语言。

## 许可证 (License)

[Apache-2.0](LICENSE)

免责声明：_这不是 Google 官方支持的产品。_

---

> **翻译说明（Translation Disclaimer）**
> 本文档由社区志愿者（[@JasonYeYuhe](https://github.com/JasonYeYuhe)）人工翻译并维护，旨在降低中文开发者的阅读门槛。最后同步日期：2026年11月14日。若译文与英文原版存在任何出入或滞后，请以 [英文原版 (README.md)](https://github.com/google/zx/blob/main/README.md) 为准。欢迎通过 PR 协助改进译文！
