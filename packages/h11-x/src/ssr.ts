import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import {
  checkFile,
  convertStreamToString,
  getDefaultBasedir,
  joinPath,
} from './utils.ts';
import type { Route } from './types.ts';
import { makeRouteUniversal } from './h11-x.ts';
import { reganVite } from 'regan-vite';

const fsApi = await getFsApi();

export const SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';
const prefix = '_vite';

type Config = {
  prod: boolean;
  prefix: string;
  devPrefix: string;
  routes: Record<
    string,
    {
      client: string;
      clientRaw: string;
      clientUrl: string;
      ssrFile: string;
      ssrFileRaw: string;
    }
  >;
};

export const makeSsr = async ({
  routes,
  baseDir,
  prod,
  prefix,
  devPrefix,
}: {
  routes: Route[];
  baseDir?: string;
  prod: boolean;
  prefix: string;
  devPrefix: string;
}) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;
  const assetsStore: Config = {
    prod,
    prefix,
    devPrefix,
    routes: {},
  };

  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    const ssrFileResult = await buildVite(
      defineConfig({
        plugins: [reganVite()],
        build: {
          outDir: joinPath(baseDirPrepared, 'ssr'),
          lib: {
            entry: ssrFile,
            formats: ['es'],
            fileName: name,
          },
          emptyOutDir: false,
        },
      })
    );

    const clientFileResult = (await buildVite(
      defineConfig({
        plugins: [reganVite()],
        build: {
          emptyOutDir: false,
          rollupOptions: {
            input: clientFile,
          },
          outDir: baseDirPrepared,
        },
      })
    )) as any;

    const filename = clientFileResult.output[0].fileName as string;

    assetsStore.routes[name] = {
      client: joinPath(baseDirPrepared, clientFileResult.output[0].fileName),
      clientRaw: clientFile,
      clientUrl: filename.split('/').slice(1).join('/'),
      ssrFile: joinPath(baseDirPrepared, `ssr/${name}.js`),
      ssrFileRaw: ssrFile,
    };
  });

  await Promise.all(routesPromises);

  const assetsJson = JSON.stringify(assetsStore, null, 2);
  fsApi.writeFile(joinPath(baseDirPrepared, 'ssr/config.json'), assetsJson);
};

export const readSsrConfig = async (baseDir?: string): Promise<Config> => {
  const baseDirPrepared = baseDir ?? getDefaultBasedir();

  const configPath = joinPath(baseDirPrepared, 'ssr/config.json');

  const configStream = fsApi.getFileStream(configPath);
  const configJson = await convertStreamToString(configStream);
  const config = JSON.parse(configJson);

  return config;
};

export const getSsrHtml = async ({
  // prod,
  // route,
  vite,
  config,
  name,
}: // baseDir,
{
  // prod: boolean;
  // route: string | Route;
  vite?: ViteDevServer;
  config: Config;
  name: string;
  // baseDir?: string;
}) => {
  const route = config.routes[name];

  if (config.prod) {
    const { getHtml } = await import(route.ssrFile);

    return () => {
      const html = getHtml();
      const path = joinPath(prefix, route.clientUrl);

      const sctipt = `<script type="module" src="${path}"></script> `;

      const htmlWithScript = html.replace(SCRIPT_KEY, sctipt);
      return htmlWithScript;
    };
  } else {
    const { getHtml } = await vite!.ssrLoadModule(route.ssrFileRaw);
    return () => {
      const html = getHtml();

      const prefixPath = joinPath(config.devPrefix, config.prefix);

      console.log('-----', 'prefixPath', prefixPath);

      const viteClient = joinPath(prefixPath, '/@vite/client');
      console.log('-----', 'viteClient', viteClient);
      const jsClient = joinPath(prefixPath, route.clientRaw);

      const sctipt1 = `<script type="module" src="${viteClient}"></script>`;
      const sctipt2 = `<script type="module" src="${jsClient}"></script> `;

      const sctits = sctipt1 + sctipt2;
      const htmlWithScript = html.replace(SCRIPT_KEY, sctits);

      console.log('-----', 'htmlWithScript', htmlWithScript);
      return htmlWithScript;
    };
  }
};

// await makeSsr({
//   routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
// });
