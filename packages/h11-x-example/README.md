# h11-x-example

Рабочий пример на [`h11-x`](../h11-x): SSR-роут (`/about`) с гидрацией на клиенте и ssg-роут (`/blog`), отрендеренный на сборке.

## Запуск

```bash
cp .env.example .env   # опционально — проверить проброс PUBLIC_*-переменных
bun run src/server.ts
```

Откроется на `http://localhost:3000/about`, dev-режим (`prod: false`) — с HMR через Vite.

Либо через [`dapes`](../../dapes.run.ts) (соберёт `h11` → `h11-x` перед запуском):

```bash
bun run ../../dapes.run.ts example run
```

## Структура

```
src/
  server.ts                     # createH11XApp + регистрация /about
  routes/about/
    about.tsx                   # regan-компонент
    about.ssr.tsx                # createPage(About)
    about.client.tsx              # hydratePage(About), импортирует about.css
    about.css                     # стили страницы — в проде приезжают <link rel="stylesheet">
    logo.svg                      # ассет из css, проверяет пути внутри собранного css
  routes/blog/
    blog.tsx                      # regan-компонент
    blog.ssg.tsx                  # getPages() — страницы, рендерятся на сборке
    blog.client.tsx               # hydratePage(Blog)
```

## `.env`

`.env.example` показывает конвенцию: только переменные с префиксом `PUBLIC_` попадают в `data.envs` на клиент, остальные остаются server-only. Файл `.env` в `.gitignore` — не коммитить туда секреты.
