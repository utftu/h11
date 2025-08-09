import { getAbsolutePath } from 'utftu';
import { defineConfig, build } from 'vite';

const h11Config = defineConfig({
  build: {
    lib: {
      entry: getAbsolutePath('./src/h11.ts', import.meta),
      name: 'h11',
    },
  },
});

// const connect = defineConfig({
//   build: {
//     lib: {
//       entry: getAbsolutePath('./src/', import.meta),
//       name: 'MyLib',
//       // the proper extensions will be added
//       fileName: 'my-lib',
//     },
//   },
// });

build(h11Config);
