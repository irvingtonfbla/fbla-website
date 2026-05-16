// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://irvingtonfbla.org',
  integrations: [sitemap()],
  server: { port: 4322 },
});