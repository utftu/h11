import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile, getDefaultBasedir, getEntName, joinPath } from './utils.ts';

const fsApi = await getFsApi();

export const makeSsr = async ({
  routes,
  baseDir,
}: {
  routes: string[];
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();

  const routesPromises = routes.map(async (route) => {
    const entName = getEntName(route);

    const ssrFile = await checkFile(route, `${entName}.ssr`, fsApi);
    const clientFile = await checkFile(route, `${entName}.client`, fsApi);

    await buildVite(
      defineConfig({
        build: {
          outDir: joinPath(baseDirPrepared, 'ssr'),
          lib: {
            entry: ssrFile,
            formats: ['es'],
            fileName: entName,
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
          outDir: baseDirPrepared,
        },
      })
    );
  });

  await Promise.all(routesPromises);
};

export const getSsrHtml = async ({
  prod,
  // pathToFile,
  // pathname,
  route,
  vite,
  baseDir,
}: {
  // pathToFile: string;
  prod: boolean;
  route: string;
  // pathname: string;
  vite?: ViteDevServer;
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || getDefaultBasedir();
  const name = getEntName(route);

  if (prod) {
    const { getHtml } = await import(
      joinPath(baseDirPrepared, `.h11x/ssr/${pathname}.js`)
    );
    return getHtml;
  } else {
    const { getHtml } = await vite!.ssrLoadModule(pathToFile);
    return getHtml;
  }
};

// await makeSsr({
//   routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
// });
