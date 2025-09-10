import { defineConfig, build as buildVite } from 'vite';
import { getAbsolutePath } from 'utftu';
import { getFsApi } from 'h11-fs';

type Inputs = { pathname: string; filename: string; dirname: string }[];

type BuildConfig = { inputs: Inputs };

const fsApi = await getFsApi();

// src/routes/about
// about.??
// about.client.ts
// about.server.ts
// about.html.ts

const createViteConfig = ({ inputs }: BuildConfig) => {
  const input = inputs.reduce<Record<string, string>>((store, value) => {
    store[value.pathname] = value.filename;
    return store;
  }, {});
  return defineConfig({
    build: {
      rollupOptions: {
        input,
      },
    },
  });
};

const build = async (config: BuildConfig) => {
  const preparetInputs = config.inputs.map(({ filename, pathname }) => {
    return {
      pathname,
      filename: getAbsolutePath(filename, import.meta),
    };
  });

  const viteConfig = createViteConfig(config);

  await buildVite(viteConfig);

  const currentDir = import.meta.dir;

  for (const { pathname, filename } of preparetInputs) {
    console.log('-----', 'filename', filename);
    await fsApi.copyFile(
      `dist/${filename.slice(currentDir.length + 1)}`,
      `dist/${pathname}.html`
    );
  }

  console.log('-----', '123');
  await fsApi.rm('dist/src');
};

await build({
  inputs: [
    {
      pathname: 'about',
      filename: './src/routes/about/about.html',
    },
  ],
});

// const config = defineConfig({
//   build: {
//     rollupOptions: {
//       input: {
//         // home: import.meta.resolve('src/home/index.html'),
//         about: import.meta.resolve('./src/routes/about/about.html'),
//         // contact: import.meta.resolve('src/contact/index.html'),
//       },
//     },
//   },
// });

// await build(
//   createViteConfig({
// inputs: [
//   {
//     pathname: 'about',
//     filename: import.meta.resolve('./src/routes/about/about.html'),
//   },
// ],
//   })
// );
