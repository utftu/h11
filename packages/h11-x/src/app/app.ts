import type { Server as HttpServer } from 'node:http';
import { H11, joinPath, serveFiles, createConnectAdapter } from 'h11';
import {
  createServer as createViteServer,
  type InlineConfig,
  type ViteDevServer,
} from 'vite';
import { defu } from 'defu';
import { buildH11X, defaultPrefix, defaultDevPrefix } from '../build/build.ts';
import { reganVite } from 'regan/vite';
import { readConfig } from '../assets/assets.ts';
import type { ConfigH11X } from '../types.ts';
import type {
  EditViteConfig,
  HealthOptions,
  LogOptions,
  Route,
  ViteBase,
} from '../types.ts';
import { getProd, loadEnvFile } from '../env/env.ts';
import { createWsHost, createWsProxy } from '../dev-ws.ts';
import { createLogReq } from '../log/log.ts';
import { addHealth } from '../health/health.ts';

export type App = {
  h11: H11;
  vite?: ViteDevServer;
  config: ConfigH11X;
  // Пути в config.json относительные, поэтому приложение носит с собой два
  // якоря: root для исходников и baseDir для собранного.
  root: string;
  baseDir: string;
  // В деве приложение держит два слушающих сокета — vite и локальный хост
  // его ws-канала, — поэтому гасить их надо вместе. В проде закрывать нечего.
  close: () => Promise<void>;
};

export const createApp = async ({
  root = process.cwd(),
  baseDir,
  routes,
  prod,
  prefix = defaultPrefix,
  devPrefix = defaultDevPrefix,
  url,
  log = {},
  health = {},
  viteBase = () => ({}),
  editViteConfig = (_, config) => config,
  h11,
}: {
  root?: string;
  baseDir?: string;
  routes?: (string | Route)[];
  // Не передан — берётся из NODE_ENV, но молчать там нельзя: непонятное или
  // пустое значение роняет старт. См. getProd.
  prod?: boolean;
  prefix?: string;
  devPrefix?: string;
  // Публичный адрес приложения целиком, как его обычно и держат в окружении:
  // APP_URL=https://nopeople.local.dev. Нужен только деву — за обратным прокси
  // vite видит в запросе чужой для себя хост и отвергает запрос, пока тот не
  // назван. В проде не используется вовсе.
  url?: string;
  // Строка на запрос в stdout. false — молчать совсем. Ассеты по умолчанию не
  // печатаются, см. LogOptions.
  log?: false | LogOptions;
  // /ping и /ready для мониторинга. checks — проверки зависимостей для
  // /ready. false — не регистрировать вовсе: пути заняты приложением.
  health?: false | HealthOptions;
  viteBase?: ViteBase;
  editViteConfig?: EditViteConfig;
  h11?: H11;
} = {}): Promise<App> => {
  // root — корень проекта, baseDir — каталог сборки. Раньше это был один
  // параметр, и .env искался внутри .h11x, который сборка сносит на каждом
  // старте: файл не читался никогда.
  const baseDirPrepared = baseDir || `${root}/.h11x`;

  await loadEnvFile(`${root}/.env`);
  // После .env: NODE_ENV мог приехать и оттуда.
  const prodFinal = getProd(prod);
  const devPrefixFull = joinPath(devPrefix, prefix);

  let vite: ViteDevServer | undefined;
  let wsHost: { server: HttpServer; port: number } | undefined;
  if (!prodFinal) {
    wsHost = await createWsHost();

    // Наш конфиг идёт первым: defu отдаёт ему приоритет и склеивает массивы в
    // том же порядке, поэтому reganVite оказывается перед плагинами
    // приложения, а middlewareMode и ws перебить нельзя.
    const config: InlineConfig = {
      // Корень vite — корень проекта: от него считаются пути к исходникам,
      // которые лежат в config.json и уходят в dev-url.
      root,
      plugins: [reganVite()],
      base: devPrefixFull,
      server: {
        middlewareMode: true,
        // Вите нужен только домен. Невалидный url уронит старт с внятным
        // сообщением — это лучше, чем молчаливые 403 на всю статику.
        allowedHosts: url === undefined ? undefined : [new URL(url).hostname],
        // Свой сервер для ws-канала: без него vite зашил бы в клиента порт
        // 24678, и HMR не дошёл бы ни через https, ни через обратный прокси.
        ws: { server: wsHost.server },
      },
      // h11-x — уже собранный пакет, а не исходники под HMR: пусть
      // ssrLoadModule требует его напрямую через Node, а не пытается
      // прогнать через свой трансформ/анализ импортов.
      ssr: { external: ['h11-x'] },
    };

    vite = await createViteServer(defu(config, viteBase()) as InlineConfig);
  }

  // В проде ничего не собирается: там уже лежит результат buildH11X со
  // сборочной машины, и его достаточно прочитать. Собирает только dev-старт —
  // ему нужны ssg-страницы на диске и свежий config.json.
  if (!prodFinal) {
    await buildH11X({
      root,
      baseDir: baseDirPrepared,
      prod: prodFinal,
      routes,
      prefix,
      devPrefix,
      viteBase,
      editViteConfig,
    });
  }

  const config = await readConfig(baseDirPrepared);

  const h11Internal = h11 || new H11();

  // Подписку ставит createApp, а не createServer из h11: отличить ассет от
  // страницы можно только зная префиксы раздачи, а они известны тут.
  if (log !== false) {
    h11Internal.ee.on(
      'response',
      createLogReq({ prefix, devPrefix: devPrefixFull, ...log }),
    );
  }

  if (!prodFinal && vite && wsHost) {
    // Раньше connect-адаптера: апгрейд — это обычный GET, и http-мидлвари
    // vite ответили бы на него первыми, до того как дело дошло бы до сокета.
    h11Internal.use(devPrefixFull, createWsProxy(wsHost.port));

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

  // Раньше роутов приложения — чтобы служебные пути не оказались за чужим
  // wildcard'ом. Отключается health: false.
  if (health !== false) {
    addHealth(h11Internal, health);
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

  // Сначала vite: он снимает с хоста свой слушатель апгрейдов, а уже потом
  // хост закрывается сам.
  const close = async () => {
    await vite?.close();
    wsHost?.server.close();
  };

  return {
    h11: h11Internal,
    vite,
    config,
    root,
    baseDir: baseDirPrepared,
    close,
  };
};
