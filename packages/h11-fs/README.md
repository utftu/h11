# h11-fs

Раздача статики и провайдеры рантайма для [`h11`](../h11): подключает `H11`-инстанс к `Bun.serve` или `node:http`, и умеет отдавать файлы с диска.

## Установка / экспорты

Три точки входа:
- `h11-fs` — раздача статики, runtime-независимый `fsApi`.
- `h11-fs/bun` — провайдер и файловый API под Bun.
- `h11-fs/node` — провайдер, файловый API и connect-адаптер под Node.

## Раздача статики

```ts
import { serveFiles } from 'h11-fs';

h11.get('/assets/**', serveFiles({ dir: './public', prefix: '/assets/' }));
```

`prefix` обрезается от начала URL перед поиском файла в `dir`; путь пользователя проходит через `joinUserPath` из `h11` (защита от `..`).

## Провайдеры

**Bun:**

```ts
import { createBunProvider } from 'h11-fs/bun';

const provider = createBunProvider({ h11 });

Bun.serve({
  port: 3000,
  fetch: (req, server) => provider(req, server),
});
```

**Node:**

```ts
import { createServer } from 'node:http';
import { createNodeProvider } from 'h11-fs/node';

const provider = createNodeProvider({ h11 });

createServer((req, res) => {
  provider({ req, res, origin: 'http://localhost:3000' });
}).listen(3000);
```

## Мост к connect-style middleware

`createConnectAdapter` (в `h11-fs/node`) оборачивает произвольный connect-middleware (`(req, res, next) => void`) в обычный `Handler` для `h11` — этим пользуется [`h11-x`](../h11-x), чтобы прозрачно проксировать dev-сервер Vite:

```ts
import { createConnectAdapter } from 'h11-fs/node';

h11.use(
  '/_dev',
  createConnectAdapter({
    prefixToRemove: '/_dev',
    connectMiddleware: someConnectApp, // например vite.middlewares
  })
);
```

Регистрировать именно через `h11.use()`, а не `h11.get(..., '/**')` — middleware матчится для любого HTTP-метода, а `.get()`-wildcard только для GET (у connect-приложений вроде Vite dev-сервера бывают не только GET-запросы).

## fsApi

`getFsApi()` — асинхронно определяет рантайм (`Bun`/`node:process.versions.node`/др.) и возвращает подходящую реализацию `FsApi` (`getFileStream`, `writeFile`, `checkExist`, `mkdir`, `copyFile`, `rm`, ...). `h11-x` использует эту абстракцию, чтобы работать одинаково под обоими рантаймами.

## Сборка

```bash
bun run build   # три entry-point'а: h11-fs.ts, providers/bun/fsapi.ts, providers/node/fsapi.ts
bun run types
```
