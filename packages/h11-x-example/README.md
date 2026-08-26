# h11-x-example

Рабочий пример на [`h11-x`](../h11-x): один SSR-роут (`/about`) с гидрацией на клиенте.

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
    about.ssr.tsx                # createGetHtml(About)
    about.client.tsx              # hydrateApp(About)
```

## `.env`

`.env.example` показывает конвенцию: только переменные с префиксом `PUBLIC_` попадают в `data.envs` на клиент, остальные остаются server-only. Файл `.env` в `.gitignore` — не коммитить туда секреты.
