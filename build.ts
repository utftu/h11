import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // home: import.meta.resolve('src/home/index.html'),
        about: import.meta.resolve('src/about/about.html'),
        // contact: import.meta.resolve('src/contact/index.html'),
      },
    },
  },
});
