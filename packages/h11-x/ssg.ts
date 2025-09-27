import {
  defineConfig,
  build as buildVite,
  type ViteDevServer,
  createServer,
} from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile, getEntName, getEntPath } from './utils.ts';
import type { GetHtmlSsg, SsgRoute } from './types.ts';

export type Page = {
  pathname: string;
  getHtml: GetHtmlSsg;
};

type GetPages = () => Promise<Page[]>;

const fsApi = await getFsApi();

type SsgRouteFull = SsgRoute & { ssgFile: string; clientFile: string };

const makeSsg = async ({
  routes,
  vite,
}: {
  routes: SsgRoute[];
  vite: ViteDevServer;
}) => {
  const jsEnts: SsgRouteFull[] = [];

  const routesPromises = routes.map(async ({ dir, name }) => {
    const entName = getEntName(dir);

    const ssgFile = await checkFile(dir, `${entName}.ssg`, fsApi);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi);

    const { getPages } = (await vite.ssrLoadModule(ssgFile)) as {
      getPages: GetPages;
    };

    const pages = await getPages();

    for (const { pathname, getHtml } of pages) {
      const html = await getHtml({ pathname });

      await fsApi.writeFile(`dist/assets/${pathname}.html`, html);
    }

    jsEnts.push({
      type: 'ssg',
      dir,
      ssgFile,
      clientFile,
      name,
    });
  });

  await Promise.all(routesPromises);

  const inputs = jsEnts.reduce<Record<string, string>>(
    (store, { name, clientFile, dir }) => {
      store[getEntPath(name, dir)] = clientFile;
      return store;
    },
    {}
  );

  const clientConfig = defineConfig({
    build: {
      rollupOptions: {
        input: inputs,
      },
    },
  });

  await buildVite(clientConfig);
};

const vite = await createServer();

await makeSsg({
  routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
  vite,
});
