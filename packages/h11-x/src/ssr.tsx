import { type ViteDevServer } from 'vite';
import { getFsApi, joinPath } from 'h11';
import { checkFile, createScriptText, getEntName } from './utils/utils.ts';
import type {
  ConfigH11X,
  EditViteConfig,
  Route,
  RouteConfig,
} from './types.ts';
import { scriptKey } from './conts.ts';
import { stringify, type FC } from 'regan';
import { getPublicEnvs } from './env.ts';
import { createAssetsHtml } from './route-config.ts';
import { buildClient, buildServer } from './build.ts';

const fsApi = await getFsApi();

// Собирает ssr-роуты и возвращает свою часть config.json. Сам ничего не пишет:
// конфиг целиком, вместе с ssg, собирает и записывает buildH11X.
export const makeSsr = async ({
  routes,
  baseDir,
  prefix,
  editViteConfig,
}: {
  routes: Route[];
  baseDir: string;
  prefix: string;
  editViteConfig: EditViteConfig;
}): Promise<Record<string, RouteConfig>> => {
  const store: Record<string, RouteConfig> = {};

  // Роуты друг от друга не зависят, поэтому собираются параллельно, а в общий
  // store каждый кладёт свою запись под своим именем.
  const routesPromises = routes.map(async ({ dir, name }) => {
    // Файлы внутри dir именуются по basename директории, а не по name
    // (name может быть вложенным путём вида "blog/aleksei").
    const fileName = getEntName(dir);
    const ssrFile = await checkFile(dir, `${fileName}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${fileName}.client`, fsApi);

    const serverOut = await buildServer({
      entry: ssrFile,
      outDir: joinPath(baseDir, 'ssr'),
      name,
      editViteConfig,
    });

    const out = await buildClient({
      entry: clientFile,
      baseDir,
      prefix,
      editViteConfig,
    });

    store[name] = {
      mode: 'ssr',
      client: { src: clientFile, out },
      server: { src: ssrFile, out: serverOut },
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
  app: { vite?: ViteDevServer; config: ConfigH11X };
  name: string;
  props?: TProps;
}) => {
  const { vite, config } = app;
  const route = config.routes[name];

  // У ssg-роута server.out экспортирует список страниц, а не страницу —
  // рендерить его на запрос нечем, да и незачем: html уже лежит на диске.
  if (route.mode === 'ssg') {
    throw new Error(
      `Route ${name} is ssg — its pages are built on disk and served as static files`,
    );
  }

  if (config.prod) {
    // Прод: берём собранный модуль и готовые теги ассетов из config.json.
    const { page } = await import(/* @vite-ignore */ route.server.out);
    const assetsHtml = createAssetsHtml(config.prefix, route.client.out);

    return () => {
      const html = page(props);

      const htmlWithScript = html.replace(scriptKey, assetsHtml);
      return htmlWithScript;
    };
  } else {
    // Dev: модуль исполняет vite прямо из исходника, поэтому страница видит
    // свежий код без пересборки.
    const { page } = await vite!.ssrLoadModule(route.server.src);
    return () => {
      const html = page(props);

      // В деве файлы отдаёт сам vite со своего префикса, а не serveFiles,
      // поэтому путь строится от devPrefix и ведёт к исходнику, не к сборке.
      const prefixPath = joinPath(config.devPrefix, config.prefix);

      const viteClient = joinPath(prefixPath, '/@vite/client');
      const jsClient = joinPath(prefixPath, route.client.src);

      // Ссылок на css тут нет намеренно: в деве стили подключает сам
      // клиентский модуль через import, а vite раздаёт их с HMR.
      const script1 = createScriptText(viteClient);
      const script2 = createScriptText(jsClient);

      const scripts = script1 + script2;
      const htmlWithScript = html.replace(scriptKey, scripts);

      return htmlWithScript;
    };
  }
};

// Оборачивает компонент в функцию рендера: на входе props, на выходе строка
// html. Публичные переменные окружения уезжают в разметку вместе с props,
// чтобы клиент прочитал их при гидрации.
export const createPage = <
  TProps extends Record<string, any> = Record<string, any>,
>(
  Component: FC<any>,
) => {
  return (props: TProps = {} as TProps) => {
    return stringify(<Component />, {
      data: { envs: getPublicEnvs(), props },
    });
  };
};
