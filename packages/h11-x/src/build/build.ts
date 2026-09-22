import { rm } from 'node:fs/promises';
import { defineConfig, build as buildVite, type Rollup } from 'vite';
import { joinPath } from 'h11';
import { defu } from 'defu';
import { reganVite } from 'regan/vite';
import { collectClientOut, writeConfig } from '../assets/assets.ts';
import { checkFileOptional, getEntName } from '../utils/utils.ts';
import { getProjectRoutes } from '../routes/routes.ts';
import { makeSsr } from '../ssr.tsx';
import { makeSsg } from '../ssg/ssg.ts';
import type { EditViteConfig, Route, RouteClientOut } from '../types.ts';

// Префикс раздачи ассетов и префикс, под которым в деве монтируется vite.
export const defaultPrefix = '/h11x';
export const defaultDevPrefix = '/_vite';

type BuildProps = {
  root?: string;
  baseDir?: string;
  routes?: (string | Route)[];
  prod?: boolean;
  devPrefix?: string;
  prefix?: string;
  editViteConfig?: EditViteConfig;
};

// Серверный модуль исполняем мы сами через import, поэтому тащить в него
// зависимости из node_modules не надо: внешним считается всё, кроме
// относительных путей и абсолютных путей проекта. Заодно h11-x и regan не
// попадают в бандл вторым экземпляром — иначе плейсхолдеры и реактивность
// оказались бы из другой копии пакета.
const checkExternal = (id: string) => {
  return !id.startsWith('.') && !id.startsWith('/');
};

const viteConfigBaseServer = defineConfig({
  plugins: [reganVite()],
  build: {
    rollupOptions: {
      external: checkExternal,
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

// Корневые стили лежат по конвенции в src/styles.css проекта. Собираются
// отдельной сборкой, а не в составе роута: файл один на всё приложение, и своим
// <link> он кешируется независимо от страниц.
export const stylesFile = 'src/styles.css';

export const buildStyles = async ({
  root,
  baseDir,
  prefix,
  editViteConfig,
}: {
  root: string;
  baseDir: string;
  prefix: string;
  editViteConfig: EditViteConfig;
}) => {
  const entry = joinPath(root, stylesFile);

  if (!(await Bun.file(entry).exists())) {
    return;
  }

  const config = defineConfig({
    base: `${prefix}/`,
    build: {
      rollupOptions: { input: entry },
      outDir: joinPath(baseDir, 'assets'),
      assetsDir: '',
    },
  });

  let configFinal = defu(config, viteConfigBaseClient);
  configFinal = editViteConfig(
    { mode: 'ssr', target: 'client', route: { dir: root, name: 'styles' } },
    configFinal,
  );

  const result = (await buildVite(configFinal)) as Rollup.RollupOutput;
  const css = result.output.find((ent) => ent.fileName.endsWith('.css'));

  if (css === undefined) {
    return;
  }

  return { src: stylesFile, out: css.fileName };
};

// Серверный модуль роута: ssr-страница или ssg-список страниц. Собирается как
// библиотека (один вход — один файл), потому что импортировать его будем мы
// сами, а не браузер. Возвращается путь относительно baseDir — в config.json
// абсолютных путей нет, иначе каталог сборки нельзя было бы перенести.
export const buildServer = async ({
  entry,
  outDirName,
  baseDir,
  mode,
  route,
  editViteConfig,
}: {
  entry: string;
  outDirName: string;
  baseDir: string;
  mode: 'ssr' | 'ssg';
  route: Route;
  editViteConfig: EditViteConfig;
}) => {
  const config = defineConfig({
    build: {
      outDir: joinPath(baseDir, outDirName),
      lib: {
        entry,
        formats: ['es'],
        fileName: route.name,
      },
    },
  });

  let configFinal = defu(config, viteConfigBaseServer);
  configFinal = editViteConfig({ mode, target: 'server', route }, configFinal);

  await buildVite(configFinal);

  return joinPath(outDirName, `${route.name}.js`);
};

// Клиентская сборка роута. Каталог сборки — тот же, что отдаёт serveFiles,
// assetsDir пустой, base равен префиксу раздачи: тогда URL файла это префикс
// плюс его имя, и ровно тот же URL vite зашивает внутрь css и динамических
// импортов. Возвращается разбор всего, что выдала сборка.
export const buildClient = async ({
  entry,
  mode,
  route,
  baseDir,
  prefix,
  editViteConfig,
}: {
  entry: string;
  mode: 'ssr' | 'ssg';
  route: Route;
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
  configFinal = editViteConfig({ mode, target: 'client', route }, configFinal);

  const result = (await buildVite(configFinal)) as Rollup.RollupOutput;

  return collectClientOut(result.output, route.dir);
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
  root = process.cwd(),
  baseDir,
  prod = process.env.NODE_ENV === 'production',
  routes,
  prefix = defaultPrefix,
  devPrefix = defaultDevPrefix,
  editViteConfig = (_, config) => config,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${root}/.h11x`;

  await rm(baseDirPrepared, { recursive: true, force: true });

  const routesResolved = routes ?? (await getProjectRoutes(root));

  const ssrRoutes: Route[] = [];
  const ssgRoutes: Route[] = [];

  for (const route of routesResolved) {
    const { dir, name } = makeRouteUniversal(route);
    // Файлы внутри dir всегда именуются по basename самой директории, даже
    // если name — вложенный путь вида "blog/aleksei" (см. getProjectRoutes).
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

  const styles = await buildStyles({
    root,
    baseDir: baseDirPrepared,
    prefix,
    editViteConfig,
  });

  const ssrStore = await makeSsr({
    routes: ssrRoutes,
    root,
    baseDir: baseDirPrepared,
    prod,
    prefix,
    editViteConfig,
  });

  // ssg-страницы ссылаются на собранные ассеты, поэтому идут после ssr: обе
  // сборки пишут в один каталог, и порядок делает вывод предсказуемым.
  const ssgStore = await makeSsg({
    routes: ssgRoutes,
    root,
    baseDir: baseDirPrepared,
    prefix,
    styles,
    editViteConfig,
  });

  // config.json читает createApp при каждом старте, поэтому пишем его
  // всегда — даже когда роутов нет (тогда routes будет пустым).
  await writeConfig(baseDirPrepared, {
    prod,
    prefix,
    devPrefix,
    styles,
    routes: { ...ssrStore, ...ssgStore },
  });
};
