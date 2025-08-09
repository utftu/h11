import { getAbsolutePath } from 'utftu';
import { defineConfig, build } from 'vite';
import dts from 'vite-plugin-dts';
import { $ } from 'bun';

const nodeModuleRegexp = /^node:/;

const h11Config = defineConfig({
  plugins: [
    // dts({
    //   // entryRoot: './src',
    //   // include: ['src/**/*.ts'],
    //   outDir: './dist/types',
    //   include: ['src/**/*.ts'],
    //   insertTypesEntry: true,
    //   // rollupTypes: true,
    // }),
  ],
  build: {
    emptyOutDir: false,
    target: 'esnext',
    lib: {
      entry: getAbsolutePath('./src/h11.ts', import.meta),
      formats: ['es'],
      fileName: 'h11',
    },
    rollupOptions: {
      external: [],
    },
  },
});

const nodeConfig = defineConfig({
  build: {
    emptyOutDir: false,
    target: 'esnext',
    lib: {
      entry: getAbsolutePath('./src/h11-node.ts', import.meta),
      formats: ['es'],
      fileName: 'node-provider',
    },
    rollupOptions: {
      external: [nodeModuleRegexp],
    },
    outDir: 'dist/node',
  },
});

const bunConfig = defineConfig({
  build: {
    emptyOutDir: false,
    target: 'esnext',
    lib: {
      entry: getAbsolutePath('./src/h11-bun.ts', import.meta),
      formats: ['es'],
      fileName: 'bun-provider',
    },
    rollupOptions: {
      external: [nodeModuleRegexp, 'bun'],
    },
    outDir: 'dist/bun',
  },
});

const fsConfig = defineConfig({
  build: {
    emptyOutDir: false,
    target: 'esnext',
    lib: {
      entry: getAbsolutePath('./src/h11-fs.ts', import.meta),
      formats: ['es'],
      fileName: 'fs',
    },
    rollupOptions: {
      external: [nodeModuleRegexp, 'bun', 'node:http'],
    },
    outDir: 'dist/fs',
  },
});

await $`rm -rf dist`;
await $`bunx tsc --project tsconfig.types.json`;

build(h11Config);
build(fsConfig);
build(nodeConfig);
build(bunConfig);
