# h11

Минималистичный HTTP-фреймворк на radix-роутере, с раздачей статики из коробки. Рантайм один — Bun; всё живёт в одной точке входа `h11`.

## Пример

```ts
import { H11, createServer } from 'h11';

const h11 = new H11();

h11.get('/hello/:name', ({ params }) => {
  return new Response(`hello, ${params.name}`);
});

h11.get('/files/**', ({ params }) => {
  return new Response(`остаток пути: ${params.wild}`);
});

const server = createServer({ h11 });

Bun.serve({
  port: 3000,
  fetch: (req, bunServer) => server(req, bunServer),
});
```

## Роутинг

- `h11.get/post/put/delete/patch/head/options(pattern, ...handlers)` — обычные роуты на конкретный метод. Можно передать несколько хендлеров подряд — выполняются по очереди, пока один не вернёт `Response`. Повторная регистрация того же пути дописывает хендлеры в конец цепочки, а не заменяет её.
- `:name` — именованный сегмент, попадает в `params.name`. Два разных имени на одном уровне (`/a/:x` и `/a/:y`) — ошибка при регистрации.
- `/**` — wildcard-хвост, остаток пути — в `params.wild`.
- `h11.use(pattern?, ...handlers)` — middleware. Выполняются для любого HTTP-метода, один раз на запрос, раньше всех маршрутов.
- Хендлер, вернувший `undefined`/ничего, передаёт управление дальше; вернувший `Response` — останавливает всё.

### Порядок маршрутов

Подошедшие маршруты собираются все, а не только первый, и пробуются по приоритету:

1. точный путь (`/users/new`);
2. путь с параметром (`/users/:id`);
3. `/**` — от самого глубокого к самому общему (`/api/**` раньше, чем `/**`).

Маршрут, все хендлеры которого вернули `undefined`, уступает ход следующему по списку. Поэтому раздача статики на `/**` не мешает точным роутам, а точный роут может «пропустить» запрос дальше, просто ничего не вернув. Если не ответил никто — `onNotFound`.

Метод учитывается при отборе: `/users/new` под `POST` не помешает запросу `GET /users/new` уйти в `/users/:id`.

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
- `getMime(path)` / `getMimeHeaders(path)` — mime по пути файла; голое расширение тоже путь (`getMime('.html')`). На незнакомом расширении — `undefined` и пустой объект соответственно.
- `getInit(mime?, code?, headers?)` или `getInit({mime, code, headers})` — `ResponseInit` для `new Response(body, init)`: `mime` это ключ таблицы (`'html'`, `'json'`, `'css'`…, проверяется компилятором), `code` — статус, `headers` — свои заголовки, к которым допишется `content-type`. Короткая форма для `getInit('json')` и `getInit('txt', 404)`, объектная — когда заполнено всё.
- `copyReq(req, newBody?)` — клонирует `Request`, опционально подменяя тело (например при чтении и повторной раздаче потока).
- `switchFunc(conditions, req)` — перебирает `{ check, handler }[]`, выполняет `handler` первого условия, чей `check(req)` вернул `true`.
- `parseCookies(req)` / `getCookie(req, name)` — читают заголовок `Cookie`.
- `setCookie(res, name, value, options?)` / `deleteCookie(res, name, options?)` — пишут `Set-Cookie` в `res.headers` (через `append`, не перезатирая предыдущие).

## Раздача статики

```ts
import { serveFiles } from 'h11';

h11.get('/assets/**', serveFiles({ dir: './public', prefix: '/assets/' }));
```

`prefix` обрезается от начала URL перед поиском файла в `dir`; путь пользователя проходит через `joinUserPath` (защита от `..`). Если файла нет, хендлер не отвечает и запрос идёт дальше по цепочке — до `onNotFound` приложения.

Кроме точного совпадения ищутся `<путь>.html` и `<путь>/index.html`, поэтому `/blog` отдаёт `blog.html`, а `/` — `index.html`. Предсжатые соседи (`.br`, `.gz`, `.deflate`) выбираются по `Accept-Encoding`; сделать их можно `compressRecursive`.

## Сервер и connect-мидлвари

```ts
import { createServer } from 'h11';

const server = createServer({ h11 });

Bun.serve({
  port: 3000,
  fetch: (req, bunServer) => server(req, bunServer),
});
```

`createConnectAdapter` оборачивает connect-мидлварь (`(req, res, next) => void`) в обычный `Handler` — этим пользуется [`h11-x`](../h11-x), чтобы проксировать dev-сервер Vite:

```ts
import { createConnectAdapter } from 'h11';

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
bun test        # тесты пакета
bun run build   # build:js (bun build src/h11.ts) + build:types (tsc)
```

## Раскладка

```
src/
  h11.ts             точка входа, только ре-экспорт
  core/              класс H11, radix-роутер, дефолтные onError/onNotFound
  static/            раздача файлов: serveFiles, поиск файла, content-type
  server.ts          адаптер под Bun.serve
  connect/           мост к connect-мидлварям
  compress.ts        предсжатие файлов
  modules/           req-id, ограничение размера тела, proxy
  utils/             join, copyReq, switchFunc, content-type
```
