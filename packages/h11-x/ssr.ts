import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile, getEntName, getEntPath } from './utils.ts';
import type { SsrRoute } from './types.ts';

const fsApi = await getFsApi();

const makeSsr = async ({ routes }: { routes: SsrRoute[] }) => {
  const jsEnts: (SsrRoute & { ssrFile: string; clientFile: string })[] = [];

  const routesPromises = routes.map(async ({ dir, pathname }) => {
    const entName = getEntName(dir);

    const file = await checkFile(dir, `${entName}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi);

    jsEnts.push({
      type: 'ssr',
      dir,
      pathname,
      ssrFile: file,
      clientFile,
    });
  });

  await Promise.all(routesPromises);

  const builds = jsEnts.map(async ({ ssrFile: filename, pathname }) => {
    const config = defineConfig({
      build: {
        outDir: '.h11x/server',
        lib: {
          entry: filename,
          formats: ['es'],
          fileName: pathname,
        },
        emptyOutDir: false,
      },
    });
    await buildVite(config);
  });

  await Promise.all(builds);

  const inputs = jsEnts.reduce<Record<string, string>>(
    (store, { pathname, clientFile, dir }) => {
      store[getEntPath(pathname, dir)] = clientFile;
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

export const getSsrHtml = async ({
  isProd,
  pathToFile,
  pathname,
  vite,
}: {
  pathToFile: string;
  isProd: boolean;
  pathname: string;
  vite?: ViteDevServer;
}) => {
  if (isProd) {
    const { getHtml } = await import(`.h11x/server/${pathname}.js`);
    return getHtml;
  } else {
    const { getHtml } = await vite!.ssrLoadModule(pathToFile);
    return getHtml;
  }
};

await makeSsr({
  routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
});
