import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/zx/',
  outDir: 'docs',
  cleanUrls: true,
  title: 'google/zx',
  titleTemplate: ':title | google/zx',
  description: 'A tool for writing better scripts',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      {text: 'Home', link: '/'},
      {text: 'Docs', link: '/getting-started'},
      {
        text: '7.x',
        items: [
          {text: 'Releases', link: 'https://github.com/google/zx/releases'},
        ],
      },
    ],

    sidebar: [
      {
        text: 'Docs',
        items: [
          {text: 'Getting Started', link: '/getting-started'},
          {text: 'Process Promise', link: '/process-promise'},
          {text: 'Quotes', link: '/quotes'},
          {text: 'Markdown Scripts', link: '/markdown-scripts'},
        ],
      },
    ],

    socialLinks: [
      {icon: 'github', link: 'https://github.com/google/zx'},
    ],

    footer: {
      message: 'Disclaimer: This is not an officially supported Google product.',
    },

    search: {
      provider: 'local',
    },
  },
})
