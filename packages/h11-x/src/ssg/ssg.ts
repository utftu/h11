import { relative } from 'node:path';
import { joinPath } from 'h11';
import { checkFile, getEntName } from '../utils/utils.ts';
import type {
  ConfigStyles,
  EditViteConfig,
  Route,
  RouteConfig,
  RoutePage,
  SsgPages,
} from '../types.ts';
import { scriptKey } from '../consts.ts';
import { createAssetsHtml } from '../assets/assets.ts';
import { buildClient, buildServer } from '../build/build.ts';

// Путь страницы становится файлом внутри каталога ассетов: "/blog" → blog.html,
// "/blog/first" → blog/first.html, корень → index.html. Именно в таком виде их
// потом находит раздача статики: /blog отдаёт blog.html, / отдаёт index.html.
export const getPageFile = (pathname: string) => {
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
  root,
  baseDir,
  prefix,
  styles,
  editViteConfig,
}: {
  routes: Route[];
  root: string;
  baseDir: string;
  prefix: string;
  styles?: ConfigStyles;
  editViteConfig: EditViteConfig;
}): Promise<Record<string, RouteConfig>> => {
  const store: Record<string, RouteConfig> = {};

  const routesPromises = routes.map(async (route) => {
    const { dir, name } = route;
    const fileName = getEntName(dir);
    const ssgFile = await checkFile(dir, `${fileName}.ssg`);
    const clientFile = await checkFile(dir, `${fileName}.client`);

    const serverOut = await buildServer({
      entry: ssgFile,
      outDirName: 'ssg',
      root,
      baseDir,
      mode: 'ssg',
      route,
      editViteConfig,
    });

    const out = await buildClient({
      entry: clientFile,
      mode: 'ssg',
      route,
      root,
      baseDir,
      prefix,
      editViteConfig,
    });

    // Страницы пекутся один раз, на сборке, поэтому теги сюда уезжают
    // прод-овые: dev-режима у ssg нет, HMR на таких страницах не будет.
    const assetsHtml = createAssetsHtml(prefix, out, styles);

    // Импортируем только что собранный модуль роута и забираем его список
    // страниц. await стоит и на списке, и на html каждой страницы, поэтому
    // промис в любом из двух мест работает сам собой, без отдельной ветки.
    const { pages } = (await import(
      /* @vite-ignore */ joinPath(baseDir, serverOut)
    )) as {
      pages: SsgPages;
    };

    const pagesResult: RoutePage[] = [];

    for (const { pathname, html } of await pages) {
      const htmlResult = await html;
      const file = getPageFile(pathname);

      // Плейсхолдер <Script/> в разметке заменяется на те же теги, что ssr
      // вставляет в проде, — иначе страница приедет без стилей и гидрации.
      await Bun.write(
        joinPath(baseDir, `assets/${file}`),
        htmlResult.replace(scriptKey, assetsHtml),
      );

      pagesResult.push({ pathname, file });
    }

    store[name] = {
      mode: 'ssg',
      client: { src: relative(root, clientFile), out },
      server: { src: relative(root, ssgFile), out: serverOut },
      pages: pagesResult,
    };
  });

  await Promise.all(routesPromises);

  return store;
};
