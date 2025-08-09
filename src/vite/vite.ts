// import { readFile } from 'node:fs/promises';
import {
  type ViteDevServer,
  build,
  createServer as createViteServer,
  defineConfig,
} from 'vite';
import { getFsApi } from '../fs-api/fs-universal.ts';
import { getText } from '../utils/stream.ts';
import { checkFile } from './utils.ts';
import { writeFile } from 'ramm';

const fsApi = await getFsApi();

type Route = {
  type: 'ssr' | 'ssg';
  dir: string;
  pathname: string;
};

const makeSsg = async ({
  vite,
  routes,
}: {
  pathToHtml: string;
  pathToJs: string;
  vite: ViteDevServer;
  url: string;
  routes: Route[];
}) => {
  await fsApi.mkdir('.h11/html');

  const htmlEntries: (Route & { entName: string; htmlPath: string })[] = [];
  const serverEntries = [];
  for (const { dir, pathname, type } of routes) {
    const entName = pathname.split('/')[-1];
    const htmlEntry = await checkFile(`${dir}`, entName + '.html');
    const { getHtml } = await vite.ssrLoadModule(htmlEntry);
    const html = await getHtml();

    const htmlPath = `.h11x/html/${pathname}.html`;
    await fsApi.writeFile(htmlPath, html);

    htmlEntries.push({
      type,
      dir,
      pathname,
      entName,
      htmlPath,
    });

    // const dirsInDist = pathname.split('/').slice(0, -1).join('/');
    // await fsApi.mkdir(dirsInDist);
    // await fsApi.writeFile(dirsInDist + '/' + filename, html);

    // const serverEntry = await checkFile(dir, filename + '.server');
    // await fsApi.mkdir(`dist/server`);

    // const text = await getText(fsApi.getFileStream(htmlCreatorFilename));
  }

  const input = htmlEntries.reduce<Record<string, string>>((store, value) => {
    store[value.pathname] = value.htmlPath;
    return store;
  }, {});
  const buildHtmls = defineConfig({
    build: {
      rollupOptions: {
        input,
      },
    },
  });

  const a = await build(buildHtmls);
};

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
