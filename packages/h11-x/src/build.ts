import { rm } from 'node:fs/promises';
import { defineConfig, build as buildVite, type Rollup } from 'vite';
import { joinPath } from 'h11';
import { defu } from 'defu';
import { reganVite } from 'regan-vite';
import { collectClientOut, writeConfig } from './assets.ts';
import { checkFileOptional, getEntName } from './utils.ts';
import { getDefaultRoutes } from './routes.ts';
import { makeSsr } from './ssr.tsx';
import { makeSsg } from './ssg.ts';
import type { EditViteConfig, Route, RouteClientOut } from './types.ts';

// Префикс раздачи ассетов и префикс, под которым в деве монтируется vite.
export const defaultPrefix = '/h11x';
export const defaultDevPrefix = '/_vite';

type BuildProps = {
  baseDir?: string;
  routes?: (string | Route)[];
  prod?: boolean;
  devPrefix?: string;
  prefix?: string;
  editViteConfig?: EditViteConfig;
};

const viteConfigBaseServer = defineConfig({
  plugins: [reganVite()],
  build: {
    rollupOptions: {
      external: ['h11-x', 'strangelove', 'regan'],
    },
    emptyOutDir: false,
  },
});

const viteConfigBaseClient = defineConfig({
  plugins: [reganVite()],
  build: {
    emptyOutDir: false,
  },
});

// Серверный модуль роута: ssr-страница или ssg-список страниц. Собирается как
// библиотека (один вход — один файл), потому что импортировать его будем мы
// сами, а не браузер. Возвращается путь к собранному файлу — его же кладём в
// config.json как server.out.
export const buildServer = async ({
  entry,
  outDir,
  name,
  editViteConfig,
}: {
  entry: string;
  outDir: string;
  name: string;
  editViteConfig: EditViteConfig;
}) => {
  const config = defineConfig({
    build: {
      outDir,
      lib: {
        entry,
        formats: ['es'],
        fileName: name,
      },
    },
  });

  let configFinal = defu(config, viteConfigBaseServer);
  configFinal = editViteConfig('ssr_server', configFinal);

  await buildVite(configFinal);

  return joinPath(outDir, `${name}.js`);
};

// Клиентская сборка роута. Каталог сборки — тот же, что отдаёт serveFiles,
// assetsDir пустой, base равен префиксу раздачи: тогда URL файла это префикс
// плюс его имя, и ровно тот же URL vite зашивает внутрь css и динамических
// импортов. Возвращается разбор всего, что выдала сборка.
export const buildClient = async ({
  entry,
  baseDir,
  prefix,
  editViteConfig,
}: {
  entry: string;
  baseDir: string;
  prefix: string;
  editViteConfig: EditViteConfig;
}): Promise<RouteClientOut> => {
  const config = defineConfig({
    base: `${prefix}/`,
    build: {
      rollupOptions: {
        input: entry,
      },
      outDir: joinPath(baseDir, 'assets'),
      assetsDir: '',
    },
  });

  let configFinal = defu(config, viteConfigBaseClient);
  configFinal = editViteConfig('ssr_client', configFinal);

  const result = (await buildVite(configFinal)) as Rollup.RollupOutput;

  return collectClientOut(result.output);
};

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
  prefix = defaultPrefix,
  devPrefix = defaultDevPrefix,
  editViteConfig = (_, config) => config,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;

  await rm(baseDirPrepared, { recursive: true, force: true });

  const routesResolved = routes ?? (await getDefaultRoutes());

  const ssrRoutes: Route[] = [];
  const ssgRoutes: Route[] = [];

  for (const route of routesResolved) {
    const { dir, name } = makeRouteUniversal(route);
    // Файлы внутри dir всегда именуются по basename самой директории, даже
    // если name — вложенный путь вида "blog/aleksei" (см. getDefaultRoutes).
    const fileName = getEntName(dir);

    const ssrFile = await checkFileOptional(dir, `${fileName}.ssr`);
    const ssgFile = await checkFileOptional(dir, `${fileName}.ssg`);
    const clientFile = await checkFileOptional(dir, `${fileName}.client`);

    if (ssrFile && ssgFile) {
      throw new Error(
        `Route ${dir} has both .ssr and .ssg files — pick one mode`,
      );
    }

    if (!ssrFile && !ssgFile && !clientFile) {
      throw new Error(`No .client, .ssr or .ssg file for route ${dir}`);
    }

    // Один только .client собирать некуда: без .ssr или .ssg нет ни страницы,
    // ни списка страниц, и роут молча выпал бы из сборки и из config.json.
    if (clientFile && !ssrFile && !ssgFile) {
      throw new Error(
        `Route ${dir} has .client but no .ssr or .ssg file — nothing to render`,
      );
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

  // config.json читает createApp при каждом старте, поэтому пишем его
  // всегда — даже когда роутов нет (тогда routes будет пустым).
  await writeConfig(baseDirPrepared, {
    prod,
    prefix,
    devPrefix,
    routes: { ...ssrStore, ...ssgStore },
  });
};
