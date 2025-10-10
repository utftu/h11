import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import type { SsrRoute } from './types.ts';
import { checkFile, getEntName, getEntPath, joinPath } from './utils.ts';

const fsApi = await getFsApi();

type SsrRouteFull = SsrRoute & { ssrFile: string; clientFile: string };

export const makeSsr = async ({
  routes,
  baseDir,
}: {
  routes: SsrRoute[];
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  const h11Dir = joinPath(baseDirPrepared, '.h11x');
  const jsEnts: SsrRouteFull[] = [];

  const routesPromises = routes.map(async ({ dir, pathname }) => {
    const entName = getEntName(dir);

    const ssrFile = await checkFile(dir, `${entName}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi);

    jsEnts.push({
      type: 'ssr',
      dir,
      pathname,
      ssrFile,
      clientFile,
    });
  });

  await Promise.all(routesPromises);

  const builds = jsEnts.map(async ({ ssrFile, pathname }) => {
    const config = defineConfig({
      build: {
        outDir: joinPath(h11Dir, 'ssr'),
        lib: {
          entry: ssrFile,
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
      emptyOutDir: false,
      rollupOptions: {
        input: inputs,
      },
      outDir: h11Dir,
    },
  });

  await buildVite(clientConfig);
};

export const getSsrHtml = async ({
  isProd,
  pathToFile,
  pathname,
  vite,
  baseDir,
}: {
  pathToFile: string;
  isProd: boolean;
  pathname: string;
  vite?: ViteDevServer;
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  if (isProd) {
    const { getHtml } = await import(
      joinPath(baseDirPrepared, `.h11x/ssr/${pathname}.js`)
    );
    return getHtml;
  } else {
    const { getHtml } = await vite!.ssrLoadModule(pathToFile);
    return getHtml;
  }
};

await makeSsr({
  routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
});
