import { fsApi } from 'h11';
import { makeSsg } from './ssg.ts';
import { makeSsr, renderSsr, createPage } from './ssr.tsx';
import { getAssets, readConfig, writeConfig } from './route-config.ts';
import type {
  ConfigH11X,
  EditViteConfig,
  Route,
  RouteAsset,
  RouteClient,
  RouteClientOut,
  RouteConfig,
  RoutePage,
  RouteServer,
} from './types.ts';
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
  const ssgRoutes: Route[] = [];

  for (const route of routesResolved) {
    const { dir, name } = makeRouteUniversal(route);
    // Файлы внутри dir всегда именуются по basename самой директории, даже
    // если name — вложенный путь вида "blog/aleksei" (см. getDefaultRoutes).
    const fileName = getEntName(dir);

    const ssrFile = await checkFileOptional(dir, `${fileName}.ssr`, fsApi);
    const ssgFile = await checkFileOptional(dir, `${fileName}.ssg`, fsApi);
    const clientFile = await checkFileOptional(
      dir,
      `${fileName}.client`,
      fsApi,
    );

    if (ssrFile && ssgFile) {
      throw new Error(
        `Route ${dir} has both .ssr and .ssg files — pick one mode`,
      );
    }

    if (!ssrFile && !ssgFile && !clientFile) {
      throw new Error(`No .client, .ssr or .ssg file for route ${dir}`);
    }

    // Страница гидрируется на клиенте, поэтому сборке нужны оба файла — без
    // .client некому подхватить разметку в браузере.
    if ((ssrFile || ssgFile) && !clientFile) {
      throw new Error(
        `Route ${dir} has .ssr or .ssg but no .client file — both are needed`,
      );
    }

    if (ssrFile) {
      ssrRoutes.push({ dir, name });
    }

    if (ssgFile) {
      ssgRoutes.push({ dir, name });
    }
  }

  const ssrStore = await makeSsr({
    routes: ssrRoutes,
    baseDir: baseDirPrepared,
    prefix,
    editViteConfig,
  });

  // ssg-страницы ссылаются на собранные ассеты, поэтому идут после ssr: обе
  // сборки пишут в один каталог, и порядок делает вывод предсказуемым.
  const ssgStore = await makeSsg({
    routes: ssgRoutes,
    baseDir: baseDirPrepared,
    prefix,
    editViteConfig,
  });

  // config.json читает createH11XApp при каждом старте, поэтому пишем его
  // всегда — даже когда роутов нет (тогда routes будет пустым).
  await writeConfig(baseDirPrepared, {
    prod,
    prefix,
    devPrefix,
    routes: { ...ssrStore, ...ssgStore },
  });
};

export { makeSsg, makeSsr, renderSsr, readConfig, createPage, getAssets };
export type {
  ConfigH11X,
  RouteAsset,
  RouteClient,
  RouteClientOut,
  RouteConfig,
  RoutePage,
  RouteServer,
};
export { createH11XApp, type H11XApp } from './app.ts';
