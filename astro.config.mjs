import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://aajkitazakhabar.pages.dev',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ur'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
