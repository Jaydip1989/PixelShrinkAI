// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pixelshrinkai.com',

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@upng/upng-js'],
    },
  },

  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        page !== 'https://pixelshrinkai.com/python-test/',
    }),
  ],
});
