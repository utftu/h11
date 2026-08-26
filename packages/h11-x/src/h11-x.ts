import { fsApi } from 'h11';
import { makeSsg } from './ssg.ts';
import { makeSsr, getSsrHtml, readSsrConfig, createGetHtml } from './ssr.tsx';
import type { EditViteConfig, Route } from './types.ts';
import { checkFile, getEntName } from './utils.ts';
import type { UserConfig } from 'vite';

type BuildProps = {
  baseDir?: string;
  routes: (string | Route)[];
  prod?: boolean;
  devPrefix?: string;
  prefix?: string;
  editViteConfig?: EditViteConfig;
};

// export const devPrefix = '/_vite';
export const prefix = '/h11x';
export const devPrefix = '/_vite/h11x';

export const makeRouteUniversal = (route: string | Route) => {
  if (typeof route === 'string') {
    return {
      dir: route,
      name: getEntName(route),
    };
  }

  return route;
};

export const buildH11X = async ({
  baseDir,
  prod = true,
  routes,
  prefix = '/h11x',
  devPrefix = '/_vite',
  editViteConfig = (_, config) => config,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;

  await fsApi.rm(baseDirPrepared);

  const ssrRoutes: Route[] = [];

  for (const route of routes) {
    const { dir, name } = makeRouteUniversal(route);

    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi);

    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    const clientFileCheck = await fsApi.checkExist(clientFile);
    if (!clientFileCheck) {
      throw new Error(`No client file ${clientFile}`);
    }

    const ssrFileCheck = await fsApi.checkExist(ssrFile);
    if (ssrFileCheck) {
      ssrRoutes.push({ dir, name });
    }
  }

  if (ssrRoutes.length) {
    await makeSsr({
      routes: ssrRoutes,
      baseDir,
      prod,
      prefix,
      devPrefix,
      editViteConfig,
    });
  }
};

export { makeSsg, makeSsr, getSsrHtml, readSsrConfig, createGetHtml };
export { createH11XApp, type H11XApp } from './app.ts';
