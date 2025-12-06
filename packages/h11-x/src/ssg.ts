import { defineConfig, build as buildVite } from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile, createSctiptText } from './utils.ts';
import type { GetHtmlSsg, Route } from './types.ts';
import { reganVite } from 'regan-vite';
import { relative } from 'node:path';
import { joinPath } from 'h11';
import defu from 'defu';
import { viteConfigBaseClient, viteConfigBaseServer } from './config.ts';
import { scriptKey } from './conts.ts';

export type Page = {
  pathname: string;
  getHtml: GetHtmlSsg;
};

type GetPages = () => Promise<Page[]>;

const fsApi = await getFsApi();

export const makeSsg = async ({
  routes,
  prod,
  baseDir,
  prefix,
  devPrefix,
}: {
  routes: Route[];
  prod: boolean;
  baseDir?: string;
  prefix: string;
  devPrefix: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();

  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssgFile = await checkFile(dir, `${name}.ssg`, fsApi);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    const serverConfig = defineConfig({
      build: {
        outDir: joinPath(baseDirPrepared, 'ssg'),
        lib: {
          entry: ssgFile,
          formats: ['es'],
          fileName: name,
        },
      },
    });
    const serverConfigFinal = defu(serverConfig, viteConfigBaseServer);

    await buildVite(serverConfigFinal);

    const configClient = defineConfig({
      build: {
        rollupOptions: {
          input: clientFile,
        },
        outDir: baseDirPrepared,
      },
    });

    const configClientFinal = defu(configClient, viteConfigBaseClient);

    // client
    const result = await buildVite(configClientFinal);

    if (!('output' in result)) {
      throw new Error('No output in build');
    }
    const buildEnt = result.output[0];

    const clientPreparedFile = relative(
      joinPath(baseDirPrepared, 'assets'),
      `${baseDirPrepared}/${buildEnt.fileName}`
    );

    const jsContent = joinPath(baseDirPrepared, `ssg/${name}.js`);
    const { getPages } = (await import(jsContent)) as {
      getPages: GetPages;
    };

    const pages = await getPages();

    for (const { pathname, getHtml } of pages) {
      const html = await getHtml({ pathname });

      let script: string;
      if (prod) {
        const path = joinPath(prefix, clientPreparedFile);

        script = createSctiptText(path);
      } else {
        const prefixPath = joinPath(devPrefix, prefix);
        const viteClient = joinPath(prefixPath, '/@vite/client');
        const jsClient = joinPath(prefixPath, clientFile);

        const sctipt1 = createSctiptText(viteClient);
        const sctipt2 = createSctiptText(jsClient);

        script = sctipt1 + sctipt2;
      }
      const htmlWithScript = html.replace(scriptKey, script);

      await fsApi.writeFile(
        joinPath(baseDirPrepared, `assets/${pathname}.html`),
        htmlWithScript
      );
    }
  });

  await Promise.all(routesPromises);
};
