import { type ViteDevServer, defineConfig } from 'vite';
import { getFsApi } from '../fs-api/fs-universal.ts';
import { checkFile } from './utils.ts';
import type { Page, SsgRoute } from './types.ts';
import { createServer as createViteServer } from 'vite';

const fsApi = await getFsApi();

const getEntName = (str: string) => {
  return str.split('/')[-1];
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
  await fsApi.mkdir('.h11/html');

  const htmlEntries: (SsgRoute & Page)[] = [];
  const serverEntries = [];
  for (const { dir, type } of routes) {
    const entName = getEntName(dir);
    const htmlEntry = await checkFile(`${dir}`, entName + '.ssg');
    const { getHtmls } = await vite.ssrLoadModule(htmlEntry);
    const pages = (await getHtmls()) as Page[];

    for (const page of pages) {
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
      store[pathname] = getHtmlPath(pathname);
      return store;
    },
    {}
  );
  const buildHtmls = defineConfig({
    build: {
      rollupOptions: {
        input,
      },
    },
  });

  // const a = await build(buildHtmls);
};

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

makeSsg({ vite, routes: [{ type: 'ssg', dir: './src/routes' }] });

// const a = async ({
//   pathToHtml,
//   pathToJs,
//   vite,
//   url,
// }: {
//   pathToHtml: string;
//   pathToJs: string;
//   vite: ViteDevServer;
//   url: string;
// }) => {
//   const stream = fsApi.getFileStream(pathToHtml);
//   const fileText = await getText(stream);
//   // const fileText = await readFile(pathToHtml, { encoding: 'utf-8' });
//   const template = await vite.transformIndexHtml(url, fileText);
//   // ????
//   const { render } = await vite.ssrLoadModule(pathToJs);
//   const appHtml = await render();
//   const html = template.replace(`<!--ssr-outlet-->`, () => appHtml);
// };
