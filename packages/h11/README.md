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

Bun.serve({
  port: 3000,
  ...createServer({ h11 }),
});
```

## Роутинг

- `h11.get/post/put/delete/patch/head/options(pattern, ...handlers)` — обычные роуты на конкретный метод. Можно передать несколько хендлеров подряд — выполняются по очереди, пока один не вернёт `Response`. Повторная регистрация того же пути дописывает хендлеры в конец цепочки, а не заменяет её.
- `:name` — именованный сегмент, попадает в `params.name`. Два разных имени на одном уровне (`/a/:x` и `/a/:y`) — ошибка при регистрации.
- `/**` — wildcard-хвост, остаток пути — в `params.wild`.
- Хвостовой слэш во входящем пути не важен: `/hello/` попадает в маршрут `/hello`. Параметры при этом не декодируются — что пришло в url, то и лежит в `params`.
- `h11.use(pattern?, ...handlers)` — middleware. Выполняются для любого HTTP-метода, один раз на запрос, раньше всех маршрутов.
- Паттерн всегда начинается со слэша и не кончается им: `users` и `/users/` — ошибка при регистрации. Исключение — корень `/`.
- Форма `ctx.data` задаётся параметром класса (`new H11<{userId: string}>()`) либо расширяется модулями — см. ниже.
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

## События

У инстанса есть шина `h11.ee`: `on(name, cb)` возвращает функцию отписки, рядом `off` и `emit`. Шина принимает любые имена, так что свои события приложение может гонять через неё же.

### request и response

Кидает их само ядро, по два на запрос: `request` до обработки, `response` после того как ответ готов — во всех ветках, то есть и когда хендлер ответил, и когда брошен `Response`, и когда сработали `onNotFound` или `onError`.

```ts
h11.ee.on('request', ({ req, reqId, providers }) => { ... });

h11.ee.on('response', ({ req, res, reqId, providers, ms, error }) => {
  console.log(res.status, new URL(req.url).pathname, ms);
});
```

События два, а не одно: запрос, который завис или уронил процесс, в `response` не приедет никогда — увидеть его можно только по `request` без пары.

- `req`, `res` и `providers` лежат сырыми, как есть: заранее ничего не выбрано, что печатать или считать — решает подписчик. Из `providers` достают ip, см. `getIp`.
- Подписчики зовутся синхронно, внутри `exec`: `res` из подписчика ещё можно испортить — не надо.
- `ms` — всё время обработки, считается от `request`: медленный подписчик это тоже время запроса, и прятать его незачем.
- `error` — только когда хендлер кинул исключение. Пятисотая, отданная хендлером осознанно, это обычный ответ, и `error` у неё нет; брошенный `Response` — тоже обычный ответ.
- Апгрейд вебсокета приезжает со статусом `101` и временем до апгрейда.

Статус берётся из настоящего ответа, а кидает событие ядро, поэтому свои `onError` и `onNotFound` оно переживает.

### Печать

Своего логгера в h11 нет: шина есть, а что писать в stdout — дело приложения. Готовая строка с фильтром «страницы печатать, ассеты нет» живёт в [`h11-x`](../h11-x), потому что отличить одно от другого можно только зная префиксы раздачи.

Руками это выглядит так:

```ts
import { getIp } from 'h11';

h11.ee.on('response', (event) => {
  const { pathname } = new URL(event.req.url);
  const ip = getIp(event) ?? '-';

  console.log(
    `${event.req.method} ${event.res.status} ${pathname} ${event.ms.toFixed(1)}ms ${ip} ${event.reqId.slice(0, 8)}`,
  );

  if (event.error) {
    console.log(event.error.stack);
  }
});
```

```
GET 200 /about 75.2ms 203.0.113.7 a76d6b9b
GET 404 /nope 0.1ms ::1 4a74aafd
POST 500 /api 12.4ms 203.0.113.7 9ab31c02
Error: внутри всё сломалось
    at ...
```

### getIp

```ts
import { getIp } from 'h11';

h11.use(({ req, providers }) => {
  console.log(getIp({ req, providers }));
});
```

Первый хоп из `x-forwarded-for`, а если заголовка нет — адрес сокета у провайдера. Именно в таком порядке: за обратным прокси в сокете всегда сам прокси (`127.0.0.1` за Caddy), и настоящего клиента видно только по заголовку. Берётся он у `ctx` и у любого из событий — поля те же.

Заголовок приходит от клиента, то есть подделывается, если до приложения можно дойти напрямую, минуя прокси. Для строки лога это терпимо, для решений — нет: пускать по этому ip или банить нельзя.

## Request ID

Каждый вызов `exec()` кладёт в контекст `reqId` — берётся из заголовка `x-request-id`, если он есть, иначе генерируется `crypto.randomUUID()`. Поле обязательное, настраивать нечего:

```ts
h11.get('/hello', ({ reqId }) => {
  console.log(reqId); // всегда есть, без .use()
});
```

Источник один: `ctx.reqId`. Нужен другой заголовок или свой формат — читай его в своей миддлвари и клади в `ctx.data`, но помни, что `ctx.reqId` при этом останется своим.

## Утилиты

- `joinPath(a, b)` — склейка путей без дублирования слэшей.
- `joinUserPath(base, userPath)` — то же самое, но для пользовательского ввода: отклоняет `..` и абсолютные пути (защита от path traversal), возвращает `''` при попытке выйти за пределы `base`.
- `getMime(path)` / `getMimeHeaders(path)` — mime по пути файла; голое расширение тоже путь (`getMime('.html')`). На незнакомом расширении — `undefined` и пустой объект соответственно.
- `getInit(mime?, code?, headers?)` или `getInit({mime, code, headers})` — `ResponseInit` для `new Response(body, init)`: `mime` это ключ таблицы (`'html'`, `'json'`, `'css'`…, проверяется компилятором), `code` — статус, `headers` — свои заголовки, к которым допишется `content-type`. Короткая форма для `getInit('json')` и `getInit('txt', 404)`, объектная — когда заполнено всё.
- `copyReq(req, newBody?)` — клонирует `Request`, опционально подменяя тело (например при чтении и повторной раздаче потока).
- `switchFunc(conditions, req)` — перебирает `{ check, handler }[]`, выполняет `handler` первого условия, чей `check(req)` вернул `true`.
- `getIp({req, providers})` — ip клиента: первый хоп из `x-forwarded-for`, иначе адрес сокета. Подробно — в «События».
- `parseCookies(req)` / `getCookie(req, name)` — читают заголовок `Cookie`.
- `setCookie(res, name, value, options?)` / `deleteCookie(res, name, options?)` — пишут `Set-Cookie` в `res.headers` (через `append`, не перезатирая предыдущие).

## Модули данных

Миддлварь, которая дописывает своё поле в `ctx.data`, помечается `createDataModule` — и тогда инстанс знает про это поле дальше по цепочке:

```ts
import { createDataModule, H11 } from 'h11';

export const authModule = createDataModule<{ user: User }>(
  async ({ req, data }) => {
    data.user = await getUser(req);
  },
);

const h11 = new H11().use(authModule);

h11.get('/me', ({ data }) => new Response(data.user.name)); // data.user типизирован
```

Тип полей указывается явно: вывести его из присваиваний внутри функции нельзя. Маркер существует только в типах, в рантайме `createDataModule` возвращает тот же хендлер. Обычная миддлварь без пометки форму `data` не меняет.

## Модули

- `createSizeLimitModule(limit)` — ограничивает размер тела запроса. Лимит включительно: тело ровно в `limit` байт проходит. Если размер виден в `content-length` — сразу `413`; если превышение вскрылось уже посреди потока, чтение тела падает с `BodyTooLargeError` (экспортируется), и её ловит `onError`, где приложение решает, чем ответить. Размеры под рукой: `SIZE_1b`, `SIZE_1kb`, `SIZE_1mb`.
- `proxyReq(req, url)` — пересобирает запрос на другой адрес, сохраняя метод, заголовки и тело.

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

Bun.serve({
  port: 3000,
  ...createServer({ h11 }),
});
```

`createServer` отдаёт пару для `Bun.serve`: `fetch` и `websocket`. Спред отдаёт обе сразу — без второй вебсокеты не поднимутся, потому что таблицу коллбеков `Bun.serve` требует заранее.

`createConnectAdapter` оборачивает connect-мидлварь (`(req, res, next) => void`) в обычный `Handler` — этим пользуется [`h11-x`](../h11-x), чтобы проксировать dev-сервер Vite:

```ts
import { createConnectAdapter } from 'h11';

h11.use(
  '/_dev',
  createConnectAdapter({
    prefixToRemove: '/_dev',
    connectMiddleware: someConnectApp, // например vite.middlewares
  }),
);
```

Регистрировать именно через `h11.use()`, а не `h11.get(..., '/**')` — middleware матчится для любого HTTP-метода, а `.get()`-wildcard только для GET (у connect-приложений вроде Vite dev-сервера бывают не только GET-запросы).

## Вебсокеты

Вебсокет — не отдельная таблица маршрутов, а то, что может сделать обычный хендлер. Поэтому работают миддлвари, параметры и `data`-модули:

```ts
h11.use('/room/**', authModule);

h11.get('/room/:id', ({ params, data, upgrade }) => {
  if (data.user === undefined) {
    return new Response('нельзя', { status: 401 });
  }

  return upgrade({
    open: (ws) => join(params.id, ws),
    message: (ws, message) => send(params.id, `${data.user.name}: ${message}`),
    close: (ws) => leave(params.id, ws),
  });
});
```

Коллбеки создаются на каждое соединение заново, поэтому состояние соединения держат в замыкании хендлера — отдельного хранилища не нужно.

`upgrade` возвращает `undefined`, если запрос не был апгрейдом: хендлер тогда считается отказавшимся и ход переходит следующему варианту, как у любого другого хендлера. Обычный GET на тот же путь можно обслужить соседним маршрутом.

Подпротокол Bun выбирает сам, повторяя запрошенный клиентом, — задавать `Sec-WebSocket-Protocol` руками не надо, от дубля заголовка браузер закрывает соединение.

## Сборка

```bash
bun test        # тесты пакета
bun run build   # build:js (bun build src/h11.ts) + build:types (tsc)
```

## Раскладка

Каждая сущность — папка со своим файлом и тестом рядом.

```
src/
  h11.ts             точка входа, только ре-экспорт
  types.ts
  core/              класс H11, события request/response, дефолтные onError/onNotFound
    radix/           radix-роутер
  static/            раздача файлов: serveFiles, поиск файла, content-type
  server/            адаптер под Bun.serve
  connect/           мост к connect-мидлварям
  compress/          предсжатие файлов
  cookies/
  data-module/       модули, расширяющие форму ctx.data
  modules/           size-limit, proxy
  utils/             join, req, switch, content-type, ip
```
