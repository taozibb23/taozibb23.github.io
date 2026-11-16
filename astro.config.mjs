// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 部署到 taozibb23.github.io(用户站)时保持 '/' 即可;
  // 若部署到普通仓库(如 github.com/taozibb23/blog),改成 '/blog'
  site: 'https://taozibb23.github.io',
  base: '/',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
  },
});
