import { H11, joinPath, serveFiles, createConnectAdapter } from 'h11';
import {
  createServer as createViteServer,
  type ViteDevServer,
  type UserConfig,
} from 'vite';
import { buildH11X, defaultPrefix, defaultDevPrefix } from '../build/build.ts';
import { reganVite } from 'regan/vite';
import { readConfig } from '../assets/assets.ts';
import type { ConfigH11X } from '../types.ts';
import type { EditViteConfig, Route } from '../types.ts';
import { loadEnvFile } from '../env/env.ts';

export type App = {
  h11: H11;
  vite?: ViteDevServer;
  config: ConfigH11X;
  // Пути в config.json относительные, поэтому приложение носит с собой два
  // якоря: root для исходников и baseDir для собранного.
  root: string;
  baseDir: string;
};

export const createApp = async ({
  root = process.cwd(),
  baseDir,
  routes,
  prod = process.env.NODE_ENV === 'production',
  prefix = defaultPrefix,
  devPrefix = defaultDevPrefix,
  editViteConfig = (_, config) => config,
  viteConfig,
  h11,
}: {
  root?: string;
  baseDir?: string;
  routes?: (string | Route)[];
  prod?: boolean;
  prefix?: string;
  devPrefix?: string;
  editViteConfig?: EditViteConfig;
  viteConfig?: UserConfig;
  h11?: H11;
} = {}): Promise<App> => {
  // root — корень проекта, baseDir — каталог сборки. Раньше это был один
  // параметр, и .env искался внутри .h11x, который сборка сносит на каждом
  // старте: файл не читался никогда.
  const baseDirPrepared = baseDir || `${root}/.h11x`;

  await loadEnvFile(`${root}/.env`);
  const devPrefixFull = joinPath(devPrefix, prefix);

  let vite: ViteDevServer | undefined;
  if (!prod) {
    vite = await createViteServer({
      ...viteConfig,
      // Корень vite — корень проекта: от него считаются пути к исходникам,
      // которые лежат в config.json и уходят в dev-url.
      root,
      plugins: [reganVite(), ...(viteConfig?.plugins ?? [])],
      base: devPrefixFull,
      server: { ...viteConfig?.server, middlewareMode: true },
      // h11-x — уже собранный пакет, а не исходники под HMR: пусть
      // ssrLoadModule требует его напрямую через Node, а не пытается
      // прогнать через свой трансформ/анализ импортов.
      ssr: { external: ['h11-x'], ...viteConfig?.ssr },
    });
  }

  // В проде ничего не собирается: там уже лежит результат buildH11X со
  // сборочной машины, и его достаточно прочитать. Собирает только dev-старт —
  // ему нужны ssg-страницы на диске и свежий config.json.
  if (!prod) {
    await buildH11X({
      root,
      baseDir: baseDirPrepared,
      prod,
      routes,
      prefix,
      devPrefix,
      editViteConfig,
    });
  }

  const config = await readConfig(baseDirPrepared);

  const h11Internal = h11 || new H11();

  if (!prod && vite) {
    // Registered as middleware (`.use()`), not `.get(..., '/**')`: `.get()`
    // wildcards are scoped to GET only (`node.wilds['GET']`), while vite's
    // dev middleware also needs to handle other methods (HMR, sourcemaps,
    // etc). `.use()` middlewares run for every method regardless.
    h11Internal.use(
      devPrefixFull,
      createConnectAdapter({
        prefixToRemove: devPrefixFull,
        connectMiddleware: vite.middlewares,
      }),
    );
  }

  const assetsDir = `${baseDirPrepared}/assets`;

  // Ассеты с хешами в именах живут в своём пространстве имён, поэтому тут
  // wildcard уместен: снаружи он ничего лишнего не открывает.
  h11Internal.get(
    `${prefix}/**`,
    serveFiles({ dir: assetsDir, prefix: `${prefix}/` }),
  );

  // Страницы ssg отдаются поимённо, а не ловушкой на "/**". Ловушка открыла
  // бы с корня сайта весь каталог сборки, делала бы поход в файловую систему
  // на каждый мусорный url и занимала бы единственный корневой слот, который
  // может понадобиться самому приложению.
  const servePage = serveFiles({ dir: assetsDir, prefix: '' });
  for (const route of Object.values(config.routes)) {
    if (route.mode !== 'ssg') {
      continue;
    }

    for (const { pathname } of route.pages) {
      h11Internal.get(pathname, servePage);
    }
  }

  return { h11: h11Internal, vite, config, root, baseDir: baseDirPrepared };
};
