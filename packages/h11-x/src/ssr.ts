import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import type { SsrRoute } from './types.ts';
import { checkFile, getEntName, joinPath } from './utils.ts';

const fsApi = await getFsApi();

export const makeSsr = async ({
  routes,
  baseDir,
}: {
  routes: SsrRoute[];
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  const h11Dir = joinPath(baseDirPrepared, '.h11x');

  const routesPromises = routes.map(async ({ dir, pathname }) => {
    const entName = getEntName(dir);

    const ssrFile = await checkFile(dir, `${entName}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi);

    await buildVite(
      defineConfig({
        build: {
          outDir: joinPath(h11Dir, 'ssr'),
          lib: {
            entry: ssrFile,
            formats: ['es'],
            fileName: pathname,
          },
          emptyOutDir: false,
        },
      })
    );

    await buildVite(
      defineConfig({
        build: {
          emptyOutDir: false,
          rollupOptions: {
            input: clientFile,
          },
          outDir: h11Dir,
        },
      })
    );
  });

  await Promise.all(routesPromises);
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
