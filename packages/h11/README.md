# h11

Минималистичный HTTP-фреймворк на radix-роутере, с раздачей статики из коробки. Сам роутинг ни к какому рантайму не привязан, но чтобы реально обслуживать запросы, нужен провайдер из `h11/bun` или `h11/node`.

## Пример

```ts
import { H11 } from 'h11';
import { createBunProvider } from 'h11/bun';

const h11 = new H11();

h11.get('/hello/:name', ({ params }) => {
  return new Response(`hello, ${params.name}`);
});

h11.get('/files/**', ({ params }) => {
  return new Response(`остаток пути: ${params.wild}`);
});

const provider = createBunProvider({ h11 });

Bun.serve({
  port: 3000,
  fetch: (req, server) => provider(req, server),
});
```

## Роутинг

- `h11.get/post/put/delete/patch/head/options(pattern, ...handlers)` — обычные роуты на конкретный метод. Можно передать несколько хендлеров подряд — выполняются по очереди, пока один не вернёт `Response`.
- `:name` — именованный сегмент, попадает в `params.name`.
- `/**` — wildcard-хвост, остаток пути — в `params.wild`. Если зарегистрировано несколько `/**` на разной глубине (например `/**` и `/api/**`), более специфичный (глубокий) пробуется первым, более общий — только как фолбэк.
- `h11.use(pattern?, ...handlers)` — middleware. Выполняются для любого HTTP-метода и всегда раньше wildcard-роутов на том же пути, независимо от глубины вложенности.
- Хендлер, вернувший `undefined`/ничего, передаёт управление следующему в цепочке; вернувший `Response` — останавливает её.

## Обработка ошибок

```ts
h11.onNotFound = ({ req }) => new Response('not found', { status: 404 });
h11.onError = ({ error }) => new Response(error.message, { status: 500 });
```

Хендлер может и просто `throw new Response(...)` — `exec()` перехватит `Response`-исключение и вернёт его как обычный ответ (полезно для ранних выходов из глубоко вложенной логики).

## Request ID

Каждый вызов `exec()` кладёт в контекст `reqId` — берётся из заголовка `x-request-id`, если он есть, иначе генерируется `crypto.randomUUID()`. Поле обязательное, настраивать нечего:

```ts
h11.get('/hello', ({ reqId }) => {
  console.log(reqId); // всегда есть, без .use()
});
```

Если нужны кастомные правила поверх дефолта (другой заголовок, другой формат id) — `createReqIdModule(header?)` кладёт результат в `data.reqId` через обычный `.use()`, независимо от встроенного `ctx.reqId`:

```ts
import { createReqIdModule } from 'h11';

h11.use(createReqIdModule('x-trace-id'));
```

## Утилиты

- `joinPath(a, b)` — склейка путей без дублирования слэшей.
- `joinUserPath(base, userPath)` — то же самое, но для пользовательского ввода: отклоняет `..` и абсолютные пути (защита от path traversal), возвращает `''` при попытке выйти за пределы `base`.
- `getContentType(ext)` / `getContentTypeHeaders(ext)` / `getContentTypeConfig(ext)` — по расширению (`js`, `html`, `json`, `css`, `svg`, `png`, `ico`); `Config` сразу возвращает `{ headers }` для `new Response(body, config)`.
- `copyReq(req, newBody?)` — клонирует `Request`, опционально подменяя тело (например при чтении и повторной раздаче потока).
- `switchFunc(conditions, req)` — перебирает `{ check, handler }[]`, выполняет `handler` первого условия, чей `check(req)` вернул `true`.
- `parseCookies(req)` / `getCookie(req, name)` — читают заголовок `Cookie`.
- `setCookie(res, name, value, options?)` / `deleteCookie(res, name, options?)` — пишут `Set-Cookie` в `res.headers` (через `append`, не перезатирая предыдущие).

## Раздача статики

`serveFiles` и runtime-независимый `fsApi` — часть основного `h11`:

```ts
import { serveFiles } from 'h11';

h11.get('/assets/**', serveFiles({ dir: './public', prefix: '/assets/' }));
```

`prefix` обрезается от начала URL перед поиском файла в `dir`; путь пользователя проходит через `joinUserPath` (защита от `..`).

`getFsApi()` асинхронно определяет рантайм (`Bun`/`node:process.versions.node`) и возвращает подходящую реализацию `FsApi` (`getFileStream`, `writeFile`, `checkExist`, `mkdir`, `copyFile`, `rm`, ...). `h11-x` использует эту абстракцию, чтобы работать одинаково под обоими рантаймами.

## Провайдеры (`h11/bun`, `h11/node`)

Runtime-специфичный код — отдельные точки входа, чтобы не тянуться в основной `h11`, если провайдер не нужен (например, если `h11` используется только как роутер за уже существующим сервером):

```ts
// Bun
import { createBunProvider } from 'h11/bun';

const provider = createBunProvider({ h11 });

Bun.serve({
  port: 3000,
  fetch: (req, server) => provider(req, server),
});
```

```ts
// Node
import { createServer } from 'node:http';
import { createNodeProvider } from 'h11/node';

const provider = createNodeProvider({ h11 });

createServer((req, res) => {
  provider({ req, res, origin: 'http://localhost:3000' });
}).listen(3000);
```

**Мост к connect-style middleware:** `createConnectAdapter` (в `h11/node`) оборачивает произвольный connect-middleware (`(req, res, next) => void`) в обычный `Handler` — этим пользуется [`h11-x`](../h11-x), чтобы прозрачно проксировать dev-сервер Vite:

```ts
import { createConnectAdapter } from 'h11/node';

h11.use(
  '/_dev',
  createConnectAdapter({
    prefixToRemove: '/_dev',
    connectMiddleware: someConnectApp, // например vite.middlewares
  })
);
```

Регистрировать именно через `h11.use()`, а не `h11.get(..., '/**')` — middleware матчится для любого HTTP-метода, а `.get()`-wildcard только для GET (у connect-приложений вроде Vite dev-сервера бывают не только GET-запросы).

## Сборка

```bash
bun run build   # h11.ts (bun, включает раздачу статики) + fs/providers/{bun,node}/fsapi.ts (node)
bun run types   # tsc --project tsconfig.types.json
```
