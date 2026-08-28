import { fsApi } from 'h11';
import { makeSsg } from './ssg.ts';
import { makeSsr, getSsrHtml, readSsrConfig, createGetHtml } from './ssr.tsx';
import type { EditViteConfig, Route } from './types.ts';
import { checkFileOptional, getEntName } from './utils/utils.ts';
import { getDefaultRoutes } from './utils/routes.ts';
import type { UserConfig } from 'vite';

type BuildProps = {
  baseDir?: string;
  routes?: (string | Route)[];
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
  prod = process.env.NODE_ENV === 'production',
  routes,
  prefix = '/h11x',
  devPrefix = '/_vite',
  editViteConfig = (_, config) => config,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;

  await fsApi.rm(baseDirPrepared);

  const routesResolved = routes ?? (await getDefaultRoutes(fsApi));

  const ssrRoutes: Route[] = [];

  for (const route of routesResolved) {
    const { dir, name } = makeRouteUniversal(route);
    // Файлы внутри dir всегда именуются по basename самой директории, даже
    // если name — вложенный путь вида "blog/aleksei" (см. getDefaultRoutes).
    const fileName = getEntName(dir);

    const ssrFile = await checkFileOptional(dir, `${fileName}.ssr`, fsApi);
    const clientFile = await checkFileOptional(
      dir,
      `${fileName}.client`,
      fsApi
    );

    if (!ssrFile && !clientFile) {
      throw new Error(`No .client or .ssr file for route ${dir}`);
    }

    // SSR-роут гидрируется на клиенте, поэтому makeSsr требует оба файла —
    // без .client там некому подхватить разметку в браузере.
    if (ssrFile && !clientFile) {
      throw new Error(
        `Route ${dir} has .ssr but no .client file — SSR routes need both`
      );
    }

    if (ssrFile) {
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
