import {
  type ViteDevServer,
  defineConfig,
  createServer as createViteServer,
  build as buildVite,
} from 'vite';
import { getFsApi } from '../fs-api/fs-universal.ts';
import { checkFile } from './utils.ts';
import type { Page, SsgRoute } from './types.ts';
import path from 'node:path';

const fsApi = await getFsApi();

const getEntName = (str: string) => {
  return str.split('/').at(-1);
};

const getHtmlPath = (pathname: string) => {
  return `.h11x/html/${pathname}.html`;
};

const makeSsg = async ({
  vite,
  routes,
}: {
  vite: ViteDevServer;
  routes: SsgRoute[];
}) => {
  await fsApi.mkdir('.h11x/html');

  const htmlEntries: (SsgRoute & Page)[] = [];
  const serverEntries = [];
  for (const { dir, type } of routes) {
    const entName = getEntName(dir);
    const htmlEntry = await checkFile(dir, entName + '.ssg', fsApi);
    const { getHtmls } = await vite.ssrLoadModule(htmlEntry);
    const pages = (await getHtmls()) as Page[];

    for (const page of pages) {
      console.log('');
      const htmlPath = `.h11x/html/${page.pathname}.html`;
      await fsApi.writeFile(htmlPath, page.html);

      htmlEntries.push({
        type,
        dir,
        ...page,
      });
    }
  }

  const input = htmlEntries.reduce<Record<string, string>>(
    (store, { pathname }) => {
      //delete /
      store[pathname.slice(1)] = path.resolve(getHtmlPath(pathname));
      return store;
    },
    {}
  );
  const buildHtmls = defineConfig({
    build: {
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        input,
        output: {
          entryFileNames: ({ name }) => {
            // убираем ".client" перед хешем
            // console.log('-----', 'entry');
            const cleanName = name?.replace(/\.client$/, '');
            // console.log('-----', 'cleanName', cleanName);
            return `assets/${cleanName}-[hash].js`;
          },
          chunkFileNames: ({ name }) => {
            console.log('-----', 'name', name);
            const cleanName = name?.replace(/\.client$/, '');
            return `assets/${cleanName}-[hash].js`;
          },
          assetFileNames: ({ name }) => {
            // для статики тоже можем почистить, если надо
            // console.log('-----', 'asset', name);
            const base = name?.replace(/\.client(\.\w+)$/, '$1');
            return `assets/${base}`;
          },
        },
      },
      emptyOutDir: false,
    },
  });

  const a = await buildVite(buildHtmls);
  // console.log('-----', 'a', a);

  const copyPromises = htmlEntries.map(({ pathname }) =>
    fsApi.copyFile(`dist/${getHtmlPath(pathname)}`, `dist/${pathname}.html`)
  );
  await Promise.all(copyPromises);

  await fsApi.rm('dist/.h11x');
};

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

await makeSsg({ vite, routes: [{ type: 'ssg', dir: './src/routes/about' }] });
vite.close();
