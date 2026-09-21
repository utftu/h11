import { getFsApi, joinPath } from 'h11';
import { checkFile, getEntName } from './utils/utils.ts';
import type {
  EditViteConfig,
  Route,
  RouteConfig,
  RoutePage,
  SsgPages,
} from './types.ts';
import { scriptKey } from './conts.ts';
import { createAssetsHtml } from './route-config.ts';
import { buildClient, buildServer } from './build.ts';

const fsApi = await getFsApi();

// Путь страницы становится файлом внутри каталога ассетов: "/blog" → blog.html,
// "/blog/first" → blog/first.html, корень → index.html. Именно в таком виде их
// потом находит раздача статики: /blog отдаёт blog.html, / отдаёт index.html.
const getPageFile = (pathname: string) => {
  const cleaned = pathname.split('/').filter(Boolean).join('/');

  if (cleaned === '') {
    return 'index.html';
  }

  return `${cleaned}.html`;
};

// Собирает ssg-роуты: печёт их страницы на диск и возвращает свою часть
// config.json. Как и makeSsr, сам конфиг не пишет.
export const makeSsg = async ({
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

  const routesPromises = routes.map(async ({ dir, name }) => {
    const fileName = getEntName(dir);
    const ssgFile = await checkFile(dir, `${fileName}.ssg`, fsApi);
    const clientFile = await checkFile(dir, `${fileName}.client`, fsApi);

    const serverOut = await buildServer({
      entry: ssgFile,
      outDir: joinPath(baseDir, 'ssg'),
      name,
      editViteConfig,
    });

    const out = await buildClient({
      entry: clientFile,
      baseDir,
      prefix,
      editViteConfig,
    });

    // Страницы пекутся один раз, на сборке, поэтому теги сюда уезжают
    // прод-овые: dev-режима у ssg нет, HMR на таких страницах не будет.
    const assetsHtml = createAssetsHtml(prefix, out);

    // Импортируем только что собранный модуль роута и забираем его список
    // страниц. await стоит и на списке, и на html каждой страницы, поэтому
    // промис в любом из двух мест работает сам собой, без отдельной ветки.
    const { pages } = (await import(/* @vite-ignore */ serverOut)) as {
      pages: SsgPages;
    };

    const pagesResult: RoutePage[] = [];

    for (const { pathname, html } of await pages) {
      const htmlResult = await html;
      const file = getPageFile(pathname);

      // Плейсхолдер <Script/> в разметке заменяется на те же теги, что ssr
      // вставляет в проде, — иначе страница приедет без стилей и гидрации.
      await fsApi.writeFile(
        joinPath(baseDir, `assets/${file}`),
        htmlResult.replace(scriptKey, assetsHtml),
      );

      pagesResult.push({ pathname, file });
    }

    store[name] = {
      mode: 'ssg',
      client: { src: clientFile, out },
      server: { src: ssgFile, out: serverOut },
      pages: pagesResult,
    };
  });

  await Promise.all(routesPromises);

  return store;
};
