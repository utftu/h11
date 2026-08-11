# h11

Минималистичный HTTP-фреймворк на radix-роутере. Сам по себе не биндится ни к какому рантайму — чтобы реально обслуживать запросы, нужен провайдер из [`h11-fs`](../h11-fs) (`h11-fs/bun` или `h11-fs/node`).

## Пример

```ts
import { H11 } from 'h11';
import { createBunProvider } from 'h11-fs/bun';

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

## Утилиты

- `joinPath(a, b)` — склейка путей без дублирования слэшей.
- `joinUserPath(base, userPath)` — то же самое, но для пользовательского ввода: отклоняет `..` и абсолютные пути (защита от path traversal), возвращает `''` при попытке выйти за пределы `base`.
- `getContentType(ext)` / `getContentTypeHeaders(ext)` / `getContentTypeConfig(ext)` — по расширению (`js`, `html`, `json`, `css`, `svg`, `png`, `ico`); `Config` сразу возвращает `{ headers }` для `new Response(body, config)`.
- `copyReq(req, newBody?)` — клонирует `Request`, опционально подменяя тело (например при чтении и повторной раздаче потока).
- `switchFunc(conditions, req)` — перебирает `{ check, handler }[]`, выполняет `handler` первого условия, чей `check(req)` вернул `true`.
- `createReqIdModule(header?)` — `DataModule`, кладёт `data.reqId` из заголовка (`x-request-id` по умолчанию) или генерирует `crypto.randomUUID()`.

## Сборка

```bash
bun run build   # bun build ./src/h11.ts --target bun --outdir ./dist
bun run types   # tsc --project tsconfig.types.json
```
