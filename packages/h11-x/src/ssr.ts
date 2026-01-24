import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import {
  checkFile,
  convertStreamToString,
  getDefaultBasedir,
} from './utils.ts';
import type { EditViteConfig, Route } from './types.ts';
import { joinPath } from 'h11';
import { scriptKey } from './conts.ts';
import { defu } from 'defu';
import { viteConfigBaseClient, viteConfigBaseServer } from './config.ts';

const createSctiptText = (src: string) => {
  return `<script type="module" defer src="${src}"></script>`;
};

const fsApi = await getFsApi();

export type ConfigSsr = {
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
  editViteConfig,
}: {
  routes: Route[];
  baseDir?: string;
  prod: boolean;
  prefix: string;
  devPrefix: string;
  editViteConfig: EditViteConfig;
}) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;
  const assetsStore: ConfigSsr = {
    prod,
    prefix,
    devPrefix,
    routes: {},
  };

  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    const configServer = defineConfig({
      build: {
        outDir: joinPath(baseDirPrepared, 'ssr'),
        lib: {
          entry: ssrFile,
          formats: ['es'],
          fileName: name,
        },
      },
    });
    let configServerFinal = defu(configServer, viteConfigBaseServer);
    configServerFinal = editViteConfig('ssr_server', configServerFinal);

    await buildVite(configServerFinal);

    let configClient = defineConfig({
      build: {
        rollupOptions: {
          input: clientFile,
        },
        outDir: baseDirPrepared,
      },
    });

    configClient = defu(configClient, viteConfigBaseClient);
    configClient = editViteConfig('ssr_client', configClient);

    const clientFileResult = (await buildVite(configClient)) as any;

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

export const readSsrConfig = async (baseDir?: string): Promise<ConfigSsr> => {
  const baseDirPrepared = baseDir ?? getDefaultBasedir();

  const configPath = joinPath(baseDirPrepared, 'ssr/config.json');

  const configStream = fsApi.getFileStream(configPath);
  const configJson = await convertStreamToString(configStream);
  const config = JSON.parse(configJson);

  return config;
};

export const getSsrHtml = async <TProps extends Record<any, any> = any>({
  vite,
  config,
  name,
  props = {} as any,
}: {
  vite?: ViteDevServer;
  config: ConfigSsr;
  name: string;
  props?: TProps;
}) => {
  const route = config.routes[name];

  if (config.prod) {
    const { getHtml } = await import(route.ssrFile);

    return () => {
      const html = getHtml(props);

      const path = joinPath(config.prefix, route.clientUrl);

      const sctipt = createSctiptText(path);

      const htmlWithScript = html.replace(scriptKey, sctipt);
      return htmlWithScript;
    };
  } else {
    const { getHtml } = await vite!.ssrLoadModule(route.ssrFileRaw);
    return () => {
      const html = getHtml(props);

      const prefixPath = joinPath(config.devPrefix, config.prefix);

      const viteClient = joinPath(prefixPath, '/@vite/client');
      const jsClient = joinPath(prefixPath, route.clientRaw);

      const sctipt1 = createSctiptText(viteClient);
      const sctipt2 = createSctiptText(jsClient);

      const scripts = sctipt1 + sctipt2;
      const htmlWithScript = html.replace(scriptKey, scripts);

      return htmlWithScript;
    };
  }
};

// await makeSsr({
//   routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
// });
