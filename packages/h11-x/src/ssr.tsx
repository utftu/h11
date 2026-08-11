import { defineConfig, build as buildVite, type ViteDevServer } from 'vite';
import { getFsApi } from 'h11-fs';
import {
  checkFile,
  convertStreamToString,
  createScriptText,
  getDefaultBasedir,
} from './utils.ts';
import type { EditViteConfig, Route } from './types.ts';
import { joinPath } from 'h11';
import { scriptKey } from './conts.ts';
import { defu } from 'defu';
import { viteConfigBaseClient, viteConfigBaseServer } from './config.ts';
import { stringify, type FC } from 'regan';
import { getPublicEnvs } from './env.ts';

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
  await fsApi.writeFile(joinPath(baseDirPrepared, 'ssr/config.json'), assetsJson);
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
  app,
  name,
  props = {} as any,
}: {
  app: { vite?: ViteDevServer; ssrConfig: ConfigSsr };
  name: string;
  props?: TProps;
}) => {
  const { vite, ssrConfig: config } = app;
  const route = config.routes[name];

  if (config.prod) {
    const { getHtml } = await import(/* @vite-ignore */ route.ssrFile);

    return () => {
      const html = getHtml(props);

      const path = joinPath(config.prefix, route.clientUrl);

      const script = createScriptText(path);

      const htmlWithScript = html.replace(scriptKey, script);
      return htmlWithScript;
    };
  } else {
    const { getHtml } = await vite!.ssrLoadModule(route.ssrFileRaw);
    return () => {
      const html = getHtml(props);

      const prefixPath = joinPath(config.devPrefix, config.prefix);

      const viteClient = joinPath(prefixPath, '/@vite/client');
      const jsClient = joinPath(prefixPath, route.clientRaw);

      const script1 = createScriptText(viteClient);
      const script2 = createScriptText(jsClient);

      const scripts = script1 + script2;
      const htmlWithScript = html.replace(scriptKey, scripts);

      return htmlWithScript;
    };
  }
};

export const createGetHtml = <TProps extends Record<string, any> = Record<string, any>>(
  Component: FC<any>,
) => {
  return (props: TProps = {} as TProps) => {
    return stringify(<Component />, {
      data: { envs: getPublicEnvs(), props },
    });
  };
};
