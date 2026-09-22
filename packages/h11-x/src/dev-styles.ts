import { joinPath } from 'h11';
import {
  type DevEnvironment,
  type EnvironmentModuleNode,
  type ViteDevServer,
} from 'vite';
import { createCssLinkText } from './utils/utils.ts';

const cssExts = ['.css', '.scss', '.sass', '.less'];

// Тип узла тут не годится: css получает type: 'css' только у запроса с
// ?direct, а импортированный из js файл лежит в графе как обычный js-модуль.
// Поэтому смотрим на расширение.
const checkCss = (url: string) => {
  const pathname = url.split('?')[0];

  for (const ext of cssExts) {
    if (pathname.endsWith(ext)) {
      return true;
    }
  }

  return false;
};

const walkModules = async (
  environment: DevEnvironment,
  node: EnvironmentModuleNode,
  visited: Set<EnvironmentModuleNode>,
  store: string[],
) => {
  if (visited.has(node)) {
    return;
  }
  visited.add(node);

  // Виртуальные модули плагинов по url не отдаются — ссылку на них не
  // построить.
  if (node.url.includes('\0')) {
    return;
  }

  if (checkCss(node.url)) {
    store.push(node.url.split('?')[0]);
    return;
  }

  // Импорты модуля известны только после его трансформации: до неё
  // importedModules пуст, и обход остановился бы на первом же шаге. Повторно
  // vite не трансформирует — результат лежит в самом узле, а горячая замена
  // его обнуляет, поэтому после правки файла мы пройдём заново.
  if (node.transformResult === null) {
    // Сломанный модуль не должен ронять страницу: ошибку покажет браузер,
    // когда сам дойдёт до этого файла.
    await environment.transformRequest(node.url).catch(() => {});
  }

  // Последовательно, а не Promise.all: порядок ссылок должен совпасть с
  // порядком импортов, иначе каскад в деве и в проде разойдётся.
  for (const imported of node.importedModules) {
    await walkModules(environment, imported, visited, store);
  }
};

// Css, который тянет за собой клиентский модуль роута. В деве сборки нет, и
// список файлов знает только vite — поэтому обходим его граф модулей.
const collectCss = async (vite: ViteDevServer, entryUrl: string) => {
  // Именно клиентское окружение: ssrLoadModule наполняет соседний граф, где
  // клиентских импортов нет.
  const environment = vite.environments.client;
  const store: string[] = [];

  await environment.transformRequest(entryUrl).catch(() => {});
  const entry = await environment.moduleGraph.getModuleByUrl(entryUrl);

  if (entry === undefined) {
    return store;
  }

  await walkModules(environment, entry, new Set(), store);

  return store;
};

// Теги стилей для dev-разметки: сначала корневой файл проекта, потом css
// роута — тот же порядок, что createAssetsHtml даёт в проде.
//
// Все ссылками с ?direct: по такому запросу vite отдаёт готовый css, и
// браузер получает стили вместе с разметкой, без моргания. Горячая замена не
// теряется — на правку файла vite шлёт css-update на этот же путь, а его
// клиент подменяет сам <link>, удаляя старый.
export const getDevStylesTags = async ({
  vite,
  prefix,
  entry,
  rootStyles,
}: {
  vite: ViteDevServer;
  // Префикс, с которого vite отдаёт файлы в деве.
  prefix: string;
  // Клиентский вход роута: путь от корня проекта, без ведущего слэша —
  // ровно то, что лежит в config.json (`src`).
  entry: string;
  // Корневой css проекта, такой же путь. Его может и не быть.
  rootStyles?: string;
}) => {
  const urls: string[] = [];

  if (rootStyles !== undefined) {
    urls.push(`/${rootStyles}`);
  }

  // Корневой файл роут может импортировать и сам — тогда он уже в списке, и
  // второй тег был бы лишним.
  for (const url of await collectCss(vite, `/${entry}`)) {
    if (urls.includes(url)) {
      continue;
    }

    urls.push(url);
  }

  let tags = '';
  for (const url of urls) {
    tags += createCssLinkText(`${joinPath(prefix, url)}?direct`);
  }

  return tags;
};
