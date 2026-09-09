import { reganVite } from 'regan-vite';
import { defineConfig } from 'vite';

export const viteConfigBaseServer = defineConfig({
  plugins: [reganVite()],
  build: {
    rollupOptions: {
      external: ['h11-x', 'strangelove', 'regan'],
    },
    emptyOutDir: false,
  },
});

export const viteConfigBaseClient = defineConfig({
  plugins: [reganVite()],
  build: {
    rollupOptions: {
      external: [],
    },
    emptyOutDir: false,
  },
});