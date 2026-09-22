# h11-x

SSR/гидрация поверх [`h11`](../h11) + Vite + [regan](https://www.npmjs.com/package/regan). Экспериментальный, активно меняющийся слой (версия `0.0.x`) — рабочий пример смотри в [`h11-x-example`](../h11-x-example).

## Конвенция файлов роута

Каждый SSR-роут — папка с тремя файлами (расширение `.tsx` или `.ts`, оба варианта проверяются):

```
routes/about/
  about.tsx         # сам regan-компонент
  about.ssr.tsx      # export const page — рендерит компонент в HTML на сервере
  about.client.tsx    # гидрирует тот же компонент в браузере
```

Клиентский файл обязателен для любого роута; серверный (`.ssr.`) — опционален, роуты без него просто не участвуют в SSR-сборке.

## Быстрый старт

```ts
// server.ts
import { getInit, createServer } from 'h11';
import { getAbsolutePath } from 'utftu';
import { createApp, renderSsr } from 'h11-x';

const app = await createApp({
  baseDir: getAbsolutePath('../.h11x', import.meta),
  routes: [getAbsolutePath('./routes/about', import.meta)],
  prod: false, // true — прод-режим: без vite dev-сервера, готовые бандлы
});

app.h11.get('/about', async () => {
  const renderHtml = await renderSsr({ app, name: 'about', props: {} });
  return new Response(renderHtml(), getInit('html'));
});

const bunProvider = createServer({ h11: app.h11 });
Bun.serve({ port: 3000, fetch: (req, server) => bunProvider(req, server) });
```

`createApp` берёт на себя: поднятие vite dev-сервера (в dev), сборку SSR/клиентских бандлов, dev-proxy к vite, раздачу собранной статики. Регистрация конкретных роутов и сам рендер — на вызывающей стороне, никакой магии.

Возвращает `{ h11, vite?, config }` — `h11` для регистрации своих роутов, `vite`/`config` нужны только если рендеришь вручную через `renderSsr`.

### Опции `createApp`

| Опция | По умолчанию | Что делает |
|---|---|---|
| `routes` | автообнаружение в `${root}/src/routes` | Список путей к папкам роутов (или `{ dir, name }`) |
| `root` | `cwd()` | Корень проекта: отсюда читается `.env` и сюда по умолчанию кладётся `.h11x` |
| `baseDir` | `${root}/.h11x` | Каталог сборки. В dev сносится на каждом старте, поэтому ничего своего туда класть нельзя |
| `prod` | `NODE_ENV === 'production'` | `false` — dev-режим с vite dev-сервером и HMR |
| `prefix` | `/h11x` | URL-префикс для раздачи собранной статики |
| `devPrefix` | `/_vite` | Префикс, где монтируется сам vite (до `prefix`) |
| `editViteConfig` | identity | Хук для правки vite-конфига: `({mode, target, route}, config) => config` |
| `viteConfig` | — | Доп. настройки для dev-сервера vite |
| `h11` | новый `H11()` | Передать уже существующий инстанс вместо создания нового |

## `.ssr.tsx` — рендер на сервере

```tsx
// about.ssr.tsx
import { createPage } from 'h11-x';
import { About } from './about.tsx';

export const page = createPage(About);
```

`createPage(Component)` возвращает `(props) => string` — рендерит компонент через `regan`'s `stringify`, автоматически прокидывая в `data.envs` публичные переменные окружения (см. ниже) и переданные `props` — в `data.props`.

## `.client.tsx` — гидрация в браузере

```tsx
// about.client.tsx
import { hydratePage } from 'h11-x/client';
import { About } from './about.tsx';

hydratePage(About);
```

Внутри компонента данные, положенные на сервере, доступны через второй аргумент FC: `(props, { globalCtx }) => { globalCtx.data.props; globalCtx.data.envs; }`.

## `h11-x/client` — остальные компоненты

- `Template` — оборачивает контент в `<!DOCTYPE html><html>...`, вставляет `<Script/>` (плейсхолдер для инжекта тегов скриптов) и `<DataSet/>` (сериализует данные рендера в `<template>` для гидрации). Пропсов не принимает: данные приходят из рендера, а не из разметки.
- `Head` / `Body` — дочерние компоненты `Template`, добавляют содержимое/атрибуты в `<head>`/`<body>`.
- `getStorageHtml()` — на клиенте читает и парсит `data`, записанные `<DataSet/>`.
- `hydratePage(Component)` — см. выше.

## Корневые стили

Файл `src/styles.css` в корне проекта подхватывается сам и подключается к каждой странице — сюда кладут шрифты, переменные, сброс стилей. В проде он собирается отдельным файлом с хешем в имени и идёт первым `<link>`, раньше стилей роута, чтобы роут мог их перебить. В деве отдаётся тем же vite с HMR.

Файла нет — ничего и не подключается, никаких ошибок.

В деве он подключается ссылкой с `?direct` — по такому запросу vite отдаёт готовый css, и браузер получает стили вместе с разметкой, без моргания. Горячая замена работает: на правку файла vite присылает `css-update` на этот же путь, а его клиент подменяет сам `<link>`.

Стили самих роутов в деве по-прежнему приходят импортом из клиентского модуля, то есть после разметки, и на первой отрисовке могут моргнуть: какие именно css тянет роут, без сборки знает только vite.

## `.env` и переменные окружения

При каждом вызове `createApp` автоматически подгружается `.env` из корня проекта (`${root}/.env`), если файл есть — парсится через `node:util`'s `parseEnv`, не перезаписывает уже выставленные снаружи переменные (окружение деплоя в приоритете).

В SSR (`createPage`) в `data.envs` автоматически попадают **только** переменные с префиксом `PUBLIC_` — остальные остаются server-only и не утекают в отрендеренный HTML/клиентский JS. См. [`.env.example`](../h11-x-example/.env.example) в примере.

## `editViteConfig`

Вызывается перед каждой vite-сборкой и получает две вещи: что собирается и сам конфиг.

```ts
const app = await createApp({
  editViteConfig: ({mode, target, route}, config) => {
    // mode   — режим роута: 'ssr' | 'ssg'
    // target — что собирается: 'server' | 'client'
    // route  — {dir, name} того роута, ради которого идёт сборка

    if (target === 'client') {
      config.build!.sourcemap = true;
    }

    return config;
  },
});
```

Оси независимые, поэтому настроить можно любое их сочетание — например, только серверные сборки ssg-роутов или один конкретный роут по имени.

## Низкоуровневые примитивы

Если `createApp`/`createPage` не подходят под задачу, доступны более примитивные функции:

- `buildH11X({ baseDir, routes, prod, prefix, devPrefix, editViteConfig })` — только сборка (без создания `H11`/vite dev-сервера).
- `readConfig(baseDir?)` — читает `.h11x/config.json`, записанный сборкой: `{ prod, prefix, devPrefix, routes }`, где каждый роут — `{ mode: 'ssr' | 'ssg', client: { src, out }, server: { src, out } }`, а у ssg ещё и `pages: [{ pathname, file }]`. `src` — исходник, `out` — результат сборки: у клиента объект со списками (`js`, `chunks`, `css`, `assets`), у сервера один собранный модуль.

Абсолютных путей в конфиге нет: `src` считается от `root`, `server.out` и всё в `client.out` — от `baseDir`. Поэтому каталог сборки можно собрать в одном месте, а запустить в другом.

`createApp` собирает проект только в dev. В проде он читает готовый `config.json`, и сборка — отдельный шаг:

```ts
// сборочная машина
await buildH11X({root, prod: true});

// боевая: тот же каталог по другому пути, vite не поднимается
const app = await createApp({root, baseDir: '/srv/app/.h11x', prod: true});
```
- `makeSsr(...)` / `makeSsg(...)` — сборка роутов одного режима; обе возвращают свою часть `routes` и ничего не пишут, конфиг собирает и записывает `buildH11X`.
- `defaultPrefix` (`/h11x`) и `defaultDevPrefix` (`/_vite`) — дефолты одноимённых опций.
- `renderSsr({ app, name, props })` — рендерит конкретный роут по имени (то, чем пользуется пример выше). В проде вставляет на место `<Script/>` все CSS-файлы роута (`<link rel="stylesheet">`) и его entry-скрипты.
- `getAssets(app, name)` — весь выход vite-сборки роута с готовыми URL: `{ js, chunks, css, assets: [{ src, url }] }`. `src` — путь файла от папки роута (`logo.svg`, `icons/logo.svg`), по нему страница находит нужный ассет, если хочет сама вставить `<link rel="preload">`. Сам h11-x preload-теги не вставляет: какой файл важен для первого экрана, знает только приложение. **В dev-режиме списки пустые**: ssr-роуты там не собираются, всё отдаёт vite из исходников.

Роут в режиме ssg (`<имя>.ssg.{ts,tsx}` рядом с `<имя>.client.{ts,tsx}`) рендерится один раз на сборке: HTML ложится в `.h11x/assets`, а отдаёт его обычная раздача статики — `/blog` находит `assets/blog.html` сам, регистрировать такой роут в `H11` не нужно. `renderSsr` на ssg-роуте бросает ошибку: рендерить там нечего.

Такой файл экспортирует `pages` — список страниц с готовой разметкой:

```tsx
const page = createPage(Blog);

export const pages = [
  {pathname: '/blog', html: page({})},
  {pathname: '/blog/first', html: page({slug: 'first'})},
];
```

`html` может быть промисом, и сам `pages` тоже (`export const pages = loadPosts()` или top-level `await`) — сборка дождётся и того, и другого.

## Сборка

```bash
bun run build   # два entry-point'а: h11-x.ts (--target bun) и h11-x.client.ts (--target browser)
bun run types
```

## Раскладка

Каждая сущность — папка со своим файлом и тестом рядом.

```
src/
  h11-x.ts          серверная точка входа, только ре-экспорт
  h11-x.client.ts   браузерная точка входа, только ре-экспорт
  ssr.tsx           ssr целиком: makeSsr, renderSsr, createPage
  types.ts  consts.ts
  app/              createApp
  build/            buildH11X, vite-сборки, обнаружение режимов роутов
  ssg/              ssg целиком: makeSsg и раскладка страниц по файлам
  assets/           разбор выхода vite, config.json, getAssets, теги
  client/           Template, Head, Body, гидрация
  routes/           обнаружение роутов по конвенции
  env/  utils/
```
