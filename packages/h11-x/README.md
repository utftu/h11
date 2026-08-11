# h11-x

SSR/гидрация поверх [`h11`](../h11) + [`h11-fs`](../h11-fs) + Vite + [regan](https://www.npmjs.com/package/regan). Экспериментальный, активно меняющийся слой (версия `0.0.x`) — рабочий пример смотри в [`h11-x-example`](../h11-x-example).

## Конвенция файлов роута

Каждый SSR-роут — папка с тремя файлами (расширение `.tsx` или `.ts`, оба варианта проверяются):

```
routes/about/
  about.tsx         # сам regan-компонент
  about.ssr.tsx      # export const getHtml — рендерит компонент в HTML на сервере
  about.client.tsx    # гидрирует тот же компонент в браузере
```

Клиентский файл обязателен для любого роута; серверный (`.ssr.`) — опционален, роуты без него просто не участвуют в SSR-сборке.

## Быстрый старт

```ts
// server.ts
import { getContentTypeConfig } from 'h11';
import { createBunProvider } from 'h11-fs/bun';
import { getAbsolutePath } from 'utftu';
import { createH11XApp, getSsrHtml } from 'h11-x';

const app = await createH11XApp({
  baseDir: getAbsolutePath('../.h11x', import.meta),
  routes: [getAbsolutePath('./routes/about', import.meta)],
  prod: false, // true — прод-режим: без vite dev-сервера, готовые бандлы
});

app.h11.get('/about', async () => {
  const getHtml = await getSsrHtml({ app, name: 'about', props: {} });
  return new Response(getHtml(), getContentTypeConfig('html'));
});

const bunProvider = createBunProvider({ h11: app.h11 });
Bun.serve({ port: 3000, fetch: (req, server) => bunProvider(req, server) });
```

`createH11XApp` берёт на себя: поднятие vite dev-сервера (в dev), сборку SSR/клиентских бандлов, dev-proxy к vite, раздачу собранной статики. Регистрация конкретных роутов и сам рендер — на вызывающей стороне, никакой магии.

Возвращает `{ h11, vite?, ssrConfig }` — `h11` для регистрации своих роутов, `vite`/`ssrConfig` нужны только если рендеришь вручную через `getSsrHtml`.

### Опции `createH11XApp`

| Опция | По умолчанию | Что делает |
|---|---|---|
| `routes` | — | Список путей к папкам роутов (или `{ dir, name }`) |
| `baseDir` | `${cwd()}/.h11x` | Куда складывать собранные бандлы |
| `prod` | `true` | `false` — dev-режим с vite dev-сервером и HMR |
| `prefix` | `/h11x` | URL-префикс для раздачи собранной статики |
| `devPrefix` | `/_vite` | Префикс, где монтируется сам vite (до `prefix`) |
| `editViteConfig` | identity | Хук для правки vite-конфига SSR/клиентской сборки |
| `viteConfig` | — | Доп. настройки для dev-сервера vite |
| `h11` | новый `H11()` | Передать уже существующий инстанс вместо создания нового |

## `.ssr.tsx` — рендер на сервере

```tsx
// about.ssr.tsx
import { createGetHtml } from 'h11-x';
import { About } from './about.tsx';

export const getHtml = createGetHtml(About);
```

`createGetHtml(Component)` возвращает `(props) => string` — рендерит компонент через `regan`'s `stringify`, автоматически прокидывая в `data.envs` публичные переменные окружения (см. ниже) и переданные `props` — в `data.props`.

## `.client.tsx` — гидрация в браузере

```tsx
// about.client.tsx
import { hydrateApp } from 'h11-x/client';
import { About } from './about.tsx';

hydrateApp(About);
```

Внутри компонента данные, положенные на сервере, доступны через второй аргумент FC: `(props, { globalCtx }) => { globalCtx.data.props; globalCtx.data.envs; }`.

## `h11-x/client` — остальные компоненты

- `Template` — оборачивает контент в `<!DOCTYPE html><html>...`, вставляет `<Script/>` (плейсхолдер для инжекта тегов скриптов) и `<DataSet/>` (сериализует `data` в `<template>` для гидрации).
- `Head` / `Body` — дочерние компоненты `Template`, добавляют содержимое/атрибуты в `<head>`/`<body>`.
- `getStorageHtml()` — на клиенте читает и парсит `data`, записанные `<DataSet/>`.
- `hydrateApp(Component)` — см. выше.

## `.env` и переменные окружения

При каждом вызове `createH11XApp` автоматически подгружается `.env` из корня проекта (`${baseDir}/.env`), если файл есть — парсится через `node:util`'s `parseEnv`, не перезаписывает уже выставленные снаружи переменные (окружение деплоя в приоритете).

В SSR (`createGetHtml`) в `data.envs` автоматически попадают **только** переменные с префиксом `PUBLIC_` — остальные остаются server-only и не утекают в отрендеренный HTML/клиентский JS. См. [`.env.example`](../h11-x-example/.env.example) в примере.

## Низкоуровневые примитивы

Если `createH11XApp`/`createGetHtml` не подходят под задачу, доступны более примитивные функции:

- `buildH11X({ baseDir, routes, prod, prefix, devPrefix, editViteConfig })` — только сборка (без создания `H11`/vite dev-сервера).
- `readSsrConfig(baseDir?)` — читает `ssr/config.json`, записанный сборкой.
- `getSsrHtml({ app, name, props })` — рендерит конкретный роут по имени (то, чем пользуется пример выше).
- `makeSsg(...)` — статическая генерация страниц (аналог SSR, но пишет готовый HTML на диск при сборке, а не рендерит на каждый запрос).

## Сборка

```bash
bun run build   # два entry-point'а: h11-x.ts (--target bun) и h11-x.client.ts (--target browser)
bun run types
```
