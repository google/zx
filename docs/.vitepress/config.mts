import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/zx/',
  outDir: 'build',
  cleanUrls: true,
  title: 'google/zx',
  titleTemplate: ':title | google/zx',
  description: 'A tool for writing better scripts',
  head: [
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/zx/img/favicons/apple-touch-icon.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/zx/img/favicons/favicon-32x32.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/zx/img/favicons/favicon-16x16.png',
      },
    ],
    [
      'link',
      {
        rel: 'mask-icon',
        href: '/zx/img/favicons/safari-pinned-tab.svg',
        color: '#3a0839',
      },
    ],
    ['link', { rel: 'shortcut icon', href: '/zx/img/favicons/favicon.ico' }],
    ['meta', { name: 'og:image', content: '/zx/img/og-image.png' }],
    ['meta', { name: 'twitter:image', content: '/zx/img/og-image.png' }],
  ],
  themeConfig: {
    logo: '/img/logo.svg',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/getting-started' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Docs',
          items: [
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Setup', link: '/setup' },
            { text: 'API Reference', link: '/api' },
            { text: 'CLI Usage', link: '/cli' },
            { text: 'Configuration', link: '/configuration' },
            { text: 'Process Promise', link: '/process-promise' },
            { text: 'Contribution Guide', link: '/contribution' },
            { text: 'Migration from v7', link: '/migration-from-v7' },
          ],
        },
        {
          text: 'FAQ',
          link: '/faq',
          items: [
            { text: 'Quotes', link: '/quotes' },
            { text: 'TypeScript', link: '/typescript' },
            { text: 'Markdown Scripts', link: '/markdown-scripts' },
            { text: 'Known Issues', link: '/known-issues' },
          ],
        },
      ],

      '/v7/': [
        {
          text: 'Docs (v7)',
          items: [
            { text: 'Getting Started', link: '/v7/getting-started' },
            { text: 'Process Promise', link: '/v7/process-promise' },
            { text: 'API Reference', link: '/v7/api' },
            { text: 'Configuration', link: '/v7/configuration' },
            { text: 'CLI Usage', link: '/v7/cli' },
          ],
        },
        {
          text: 'FAQ',
          link: '/v7/faq',
          items: [
            { text: 'Quotes', link: '/v7/quotes' },
            { text: 'TypeScript', link: '/v7/typescript' },
            { text: 'Markdown Scripts', link: '/v7/markdown-scripts' },
            { text: 'Known Issues', link: '/v7/known-issues' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/google/zx' }],

    editLink: {
      pattern: 'https://github.com/google/zx/blob/main/docs/:path',
    },

    footer: {
      message:
        'Disclaimer: This is not an officially supported Google product.',
    },

    search: {
      provider: 'local',
    },
  },
})
