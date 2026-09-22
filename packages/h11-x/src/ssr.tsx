import { relative } from 'node:path';
import { type ViteDevServer } from 'vite';
import { joinPath } from 'h11';
import {
  checkFile,
  createCssLinkText,
  createScriptText,
  getEntName,
} from './utils/utils.ts';
import type {
  ConfigH11X,
  EditViteConfig,
  Route,
  RouteConfig,
} from './types.ts';
import { scriptKey } from './consts.ts';
import { stringify, type FC } from 'regan';
import { getPublicEnvs } from './env/env.ts';
import { createAssetsHtml } from './assets/assets.ts';
import { buildClient, buildServer } from './build/build.ts';

// Собирает ssr-роуты и возвращает свою часть config.json. Сам ничего не пишет:
// конфиг целиком, вместе с ssg, собирает и записывает buildH11X.
export const makeSsr = async ({
  routes,
  root,
  baseDir,
  prod,
  prefix,
  editViteConfig,
}: {
  routes: Route[];
  root: string;
  baseDir: string;
  prod: boolean;
  prefix: string;
  editViteConfig: EditViteConfig;
}): Promise<Record<string, RouteConfig>> => {
  const store: Record<string, RouteConfig> = {};

  // Роуты друг от друга не зависят, поэтому собираются параллельно, а в общий
  // store каждый кладёт свою запись под своим именем.
  const routesPromises = routes.map(async (route) => {
    const { dir, name } = route;
    // Файлы внутри dir именуются по basename директории, а не по name
    // (name может быть вложенным путём вида "blog/aleksei").
    const fileName = getEntName(dir);
    const ssrFile = await checkFile(dir, `${fileName}.ssr`);
    const clientFile = await checkFile(dir, `${fileName}.client`);

    // В деве ssr-роут не собирается вовсе: renderSsr берёт серверный модуль
    // из исходника через vite, а клиентский скрипт отдаётся тем же vite по
    // devPrefix. Собирать бандлы, которые никто не откроет, — это секунды на
    // каждом рестарте. Цена: out в конфиге пустой, то есть getAssets в деве
    // ничего не вернёт.
    if (!prod) {
      store[name] = {
        mode: 'ssr',
        client: {
          src: relative(root, clientFile),
          out: { js: [], chunks: [], css: [], assets: [] },
        },
        server: { src: relative(root, ssrFile), out: '' },
      };
      return;
    }

    const serverOut = await buildServer({
      entry: ssrFile,
      outDirName: 'ssr',
      baseDir,
      mode: 'ssr',
      route,
      editViteConfig,
    });

    const out = await buildClient({
      entry: clientFile,
      mode: 'ssr',
      route,
      baseDir,
      prefix,
      editViteConfig,
    });

    store[name] = {
      mode: 'ssr',
      client: { src: relative(root, clientFile), out },
      server: { src: relative(root, ssrFile), out: serverOut },
    };
  });

  await Promise.all(routesPromises);

  return store;
};

// Готовит рендер одного роута. Асинхронная часть — загрузка серверного модуля
// — делается один раз, поэтому наружу отдаётся функция: её зовут на каждый
// запрос, и она уже синхронная.
export const renderSsr = async <TProps extends Record<any, any> = any>({
  app,
  name,
  props = {} as any,
}: {
  app: {
    vite?: ViteDevServer;
    config: ConfigH11X;
    root: string;
    baseDir: string;
  };
  name: string;
  props?: TProps;
}) => {
  const { vite, config, root, baseDir } = app;
  const route = config.routes[name];

  // У ssg-роута server.out экспортирует список страниц, а не страницу —
  // рендерить его на запрос нечем, да и незачем: html уже лежит на диске.
  if (route.mode === 'ssg') {
    throw new Error(
      `Route ${name} is ssg — its pages are built on disk and served as static files`,
    );
  }

  // Режим решает config.prod, записанный сборкой. Если он говорит dev, а
  // vite-сервера нет — это рассогласование сборки и запуска, и правильно
  // упасть сразу, а не отрендерить что-то наполовину рабочее.
  if (config.prod) {
    // Прод: берём собранный модуль и готовые теги ассетов из config.json.
    // server.out лежит в config.json относительно baseDir — собираем
    // абсолютный путь здесь, чтобы каталог сборки можно было перенести.
    const { page } = await import(
      /* @vite-ignore */ joinPath(baseDir, route.server.out)
    );
    const assetsHtml = createAssetsHtml(
      config.prefix,
      route.client.out,
      config.styles,
    );

    return () => {
      const html = page(props);

      const htmlWithScript = html.replace(scriptKey, assetsHtml);
      return htmlWithScript;
    };
  } else {
    // Dev: модуль исполняет vite прямо из исходника, поэтому страница видит
    // свежий код без пересборки.
    if (vite === undefined) {
      throw new Error(
        `Route ${name}: config says dev, but there is no vite server — rebuild with prod: true or start the app in dev`,
      );
    }

    const { page } = await vite.ssrLoadModule(joinPath(root, route.server.src));
    return () => {
      const html = page(props);

      // В деве файлы отдаёт сам vite со своего префикса, а не serveFiles,
      // поэтому путь строится от devPrefix и ведёт к исходнику, не к сборке.
      const prefixPath = joinPath(config.devPrefix, config.prefix);

      const viteClient = joinPath(prefixPath, '/@vite/client');
      const jsClient = joinPath(prefixPath, route.client.src);

      // Корневые стили — ссылкой с ?direct: по такому запросу vite отдаёт
      // готовый css, и браузер получает стили вместе с разметкой, без
      // моргания. Горячая замена при этом работает: на правку файла vite
      // присылает css-update именно на этот путь, а его клиент подменяет
      // сам <link>, удаляя старый. Модуль тут не нужен — он дал бы вторую
      // загрузку того же файла и вторую копию стилей в DOM.
      const stylesTags =
        config.styles === undefined
          ? ''
          : createCssLinkText(
              `${joinPath(prefixPath, config.styles.src)}?direct`,
            );

      // Стили роута тут не перечислить: в деве сборки нет, и какие css тянет
      // клиентский модуль, знает только vite. Их по-прежнему подключает
      // импорт внутри модуля — и они по-прежнему могут моргнуть.
      const script1 = createScriptText(viteClient);
      const script2 = createScriptText(jsClient);

      const scripts = stylesTags + script1 + script2;
      const htmlWithScript = html.replace(scriptKey, scripts);

      return htmlWithScript;
    };
  }
};

// Оборачивает компонент в функцию рендера: на входе props, на выходе строка
// html. Публичные переменные окружения уезжают в разметку вместе с props,
// чтобы клиент прочитал их при гидрации.
// Пропсы уходят двумя путями сразу: в сам компонент — чтобы сервер отрендерил
// с ними, и в data — чтобы клиент при гидрации собрал ровно то же дерево.
export const createPage = <
  TProps extends Record<string, any> = Record<string, any>,
>(
  Component: FC<TProps>,
) => {
  return (props: TProps = {} as TProps) => {
    return stringify(<Component {...props} />, {
      data: { envs: getPublicEnvs(), props },
    });
  };
};
