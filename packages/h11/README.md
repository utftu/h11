# h11

A minimal HTTP framework on a radix router, with static file serving out of the box. One runtime — Bun; everything lives behind a single entry point, `h11`.

## Install

```bash
npm i h11
# or
bun add h11
```

The runtime is Bun: the package calls `Bun.serve`, `Bun.file` and `Bun.write` directly.

## Example

```ts
import { H11, createServer } from 'h11';

const h11 = new H11();

h11.get('/hello/:name', ({ params }) => {
  return new Response(`hello, ${params.name}`);
});

h11.get('/files/**', ({ params }) => {
  return new Response(`rest of the path: ${params.wild}`);
});

Bun.serve({
  port: 3000,
  ...createServer({ h11 }),
});
```

## Routing

- `h11.get/post/put/delete/patch/head/options(pattern, ...handlers)` — plain routes for one method. Several handlers can be passed at once — they run in order until one returns a `Response`. Registering the same path again appends handlers to the end of the chain instead of replacing it.
- `:name` — a named segment, lands in `params.name`. Two different names at the same level (`/a/:x` and `/a/:y`) is a registration error.
- `/**` — a wildcard tail, the rest of the path goes to `params.wild`.
- A trailing slash in the incoming path does not matter: `/hello/` matches the route `/hello`. Params are not decoded along the way — whatever arrived in the url is what sits in `params`.
- `h11.use(pattern?, ...handlers)` — middleware. Runs for any HTTP method, once per request, before every route.
- A pattern always starts with a slash and never ends with one: `users` and `/users/` are registration errors. The root `/` is the exception.
- The shape of `ctx.data` is set by the class parameter (`new H11<{userId: string}>()`) or extended by modules — see below.
- A handler that returns `undefined`/nothing passes control on; one that returns a `Response` stops everything.

### Route order

All matching routes are collected, not just the first one, and tried by priority:

1. the exact path (`/users/new`);
2. the path with a param (`/users/:id`);
3. `/**` — from the deepest to the most general (`/api/**` before `/**`).

A route whose handlers all returned `undefined` yields to the next candidate. That is why static file serving on `/**` does not get in the way of exact routes, and an exact route can "pass the request along" simply by returning nothing. If nobody answered — `onNotFound`.

The method is taken into account during selection: `/users/new` registered for `POST` does not stop `GET /users/new` from reaching `/users/:id`.

## Error handling

```ts
h11.onNotFound = ({ req }) => new Response('not found', { status: 404 });
h11.onError = ({ error }) => new Response(error.message, { status: 500 });
```

A handler may also just `throw new Response(...)` — `exec()` catches a thrown `Response` and returns it as an ordinary answer (handy for early exits from deeply nested logic).

## Events

The instance carries a bus, `h11.ee`: `on(name, cb)` returns an unsubscribe function, with `off` and `emit` next to it. The bus accepts any names, so an application can push its own events through it too.

### request and response

The core emits them itself, two per request: `request` before handling, `response` once the answer is ready — in every branch, meaning when a handler answered, when a `Response` was thrown, and when `onNotFound` or `onError` kicked in.

```ts
h11.ee.on('request', ({ req, reqId, providers }) => { ... });

h11.ee.on('response', ({ req, res, reqId, providers, ms, error }) => {
  console.log(res.status, new URL(req.url).pathname, ms);
});
```

There are two events, not one: a request that hung or killed the process will never arrive at `response` — the only way to see it is a `request` without a pair.

- `req`, `res` and `providers` are raw, as they are: nothing is picked in advance, and what to print or count is up to the subscriber. The ip comes out of `providers`, see `getIp`.
- Subscribers are called synchronously, inside `exec`: a subscriber can still spoil `res` — don't.
- `ms` is the whole handling time, measured from `request`: a slow subscriber is also request time, and there is no reason to hide it.
- `error` — only when a handler threw. A 500 returned deliberately by a handler is an ordinary answer and has no `error`; a thrown `Response` is an ordinary answer too.
- A websocket upgrade arrives with status `101` and the time up to the upgrade.

The status is read from the real response, and the core is the one emitting, so it survives your own `onError` and `onNotFound`.

### Printing

h11 has no logger of its own: there is a bus, and what goes to stdout is the application's business. A ready-made line with a "print pages, skip assets" filter lives in [`h11-x`](../h11-x), because telling one from the other is only possible when you know the serving prefixes.

By hand it looks like this:

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
Error: everything broke inside
    at ...
```

### getIp

```ts
import { getIp } from 'h11';

h11.use(({ req, providers }) => {
  console.log(getIp({ req, providers }));
});
```

The first hop of `x-forwarded-for`, and if the header is missing — the socket address from the provider. In exactly that order: behind a reverse proxy the socket always holds the proxy itself (`127.0.0.1` behind Caddy), and the real client is only visible in the header. It takes either `ctx` or any of the events — the fields are the same.

The header comes from the client, which means it can be forged if the application can be reached directly, bypassing the proxy. For a log line that is tolerable, for decisions it is not: never allow or ban by this ip.

## Request ID

Every `exec()` call puts a `reqId` into the context — taken from the `x-request-id` header if present, otherwise generated with `crypto.randomUUID()`. The field is mandatory and there is nothing to configure:

```ts
h11.get('/hello', ({ reqId }) => {
  console.log(reqId); // always there, no .use() needed
});
```

There is one source: `ctx.reqId`. If you need another header or your own format, read it in your own middleware and put it into `ctx.data` — but remember that `ctx.reqId` will keep its own value.

## Utilities

- `joinPath(a, b)` — joins paths without doubling slashes.
- `joinUserPath(base, userPath)` — the same, but for user input: rejects `..` and absolute paths (path traversal protection), returns `''` on an attempt to escape `base`.
- `getMime(path)` / `getMimeHeaders(path)` — mime by file path; a bare extension is a path too (`getMime('.html')`). On an unknown extension — `undefined` and an empty object respectively.
- `getInit(mime?, code?, headers?)` or `getInit({mime, code, headers})` — a `ResponseInit` for `new Response(body, init)`: `mime` is a key of the table (`'html'`, `'json'`, `'css'`…, checked by the compiler), `code` is the status, `headers` are your own headers, to which `content-type` is added. The short form is for `getInit('json')` and `getInit('txt', 404)`, the object form — when everything is filled in.
- `copyReq(req, newBody?)` — clones a `Request`, optionally swapping the body (for example when a stream is read and then served again).
- `switchFunc(conditions, req)` — walks `{ check, handler }[]` and runs the `handler` of the first condition whose `check(req)` returned `true`.
- `getIp({req, providers})` — the client ip: the first hop of `x-forwarded-for`, otherwise the socket address. Details in "Events".
- `parseCookies(req)` / `getCookie(req, name)` — read the `Cookie` header.
- `setCookie(res, name, value, options?)` / `deleteCookie(res, name, options?)` — write `Set-Cookie` into `res.headers` (via `append`, without overwriting previous ones).

## Data modules

A middleware that adds its own field to `ctx.data` is marked with `createDataModule` — and then the instance knows about that field further down the chain:

```ts
import { createDataModule, H11 } from 'h11';

export const authModule = createDataModule<{ user: User }>(
  async ({ req, data }) => {
    data.user = await getUser(req);
  },
);

const h11 = new H11().use(authModule);

h11.get('/me', ({ data }) => new Response(data.user.name)); // data.user is typed
```

The field types are stated explicitly: they cannot be inferred from the assignments inside the function. The marker exists only in the types, at runtime `createDataModule` returns the very same handler. An ordinary middleware without the mark does not change the shape of `data`.

## Modules

- `createSizeLimitModule(limit)` — limits the request body size. The limit is inclusive: a body of exactly `limit` bytes passes. If the size is visible in `content-length` — `413` right away; if the excess only showed up mid-stream, reading the body fails with `BodyTooLargeError` (exported), and `onError` catches it, where the application decides what to answer. Sizes are at hand: `SIZE_1b`, `SIZE_1kb`, `SIZE_1mb`.
- `proxyReq(req, url)` — rebuilds the request for another address, keeping the method, headers and body.

## Static file serving

```ts
import { serveFiles } from 'h11';

h11.get('/assets/**', serveFiles({ dir: './public', prefix: '/assets/' }));
```

`prefix` is cut off the start of the URL before the file is looked up in `dir`; the user path goes through `joinUserPath` (protection from `..`). If the file is missing, the handler does not answer and the request goes further down the chain — all the way to the application's `onNotFound`.

Besides the exact match, `<path>.html` and `<path>/index.html` are looked up, so `/blog` serves `blog.html` and `/` serves `index.html`. Pre-compressed neighbours (`.br`, `.gz`, `.deflate`) are picked by `Accept-Encoding`; `compressRecursive` can make them.

## The server and connect middlewares

```ts
import { createServer } from 'h11';

Bun.serve({
  port: 3000,
  ...createServer({ h11 }),
});
```

`createServer` returns the pair for `Bun.serve`: `fetch` and `websocket`. The spread hands over both at once — without the second one websockets will not come up, because `Bun.serve` wants the callback table up front.

`createConnectAdapter` wraps a connect middleware (`(req, res, next) => void`) into an ordinary `Handler` — that is what [`h11-x`](../h11-x) uses to proxy the Vite dev server:

```ts
import { createConnectAdapter } from 'h11';

h11.use(
  '/_dev',
  createConnectAdapter({
    prefixToRemove: '/_dev',
    connectMiddleware: someConnectApp, // vite.middlewares, for instance
  }),
);
```

Register it through `h11.use()` and not `h11.get(..., '/**')` — middleware matches any HTTP method, while a `.get()` wildcard only matches GET (connect applications like the Vite dev server do get more than GET requests).

## Websockets

A websocket is not a separate routing table, it is something an ordinary handler can do. So middlewares, params and `data` modules all work:

```ts
h11.use('/room/**', authModule);

h11.get('/room/:id', ({ params, data, upgrade }) => {
  if (data.user === undefined) {
    return new Response('not allowed', { status: 401 });
  }

  return upgrade({
    open: (ws) => join(params.id, ws),
    message: (ws, message) => send(params.id, `${data.user.name}: ${message}`),
    close: (ws) => leave(params.id, ws),
  });
});
```

The callbacks are created anew for every connection, so connection state is kept in the handler's closure — no separate store is needed.

`upgrade` returns `undefined` if the request was not an upgrade: the handler then counts as having declined, and the turn passes to the next candidate, like with any other handler. A plain GET on the same path can be served by a neighbouring route.

Bun picks the subprotocol itself, echoing the one the client asked for — there is no need to set `Sec-WebSocket-Protocol` by hand, a duplicated header makes the browser close the connection.

## Build

```bash
bun test        # the package's tests
bun run build   # build:js (bun build src/h11.ts) + build:types (tsc)
```

## Layout

Every entity is a folder with its own file and a test next to it.

```
src/
  h11.ts             entry point, re-export only
  types.ts
  core/              the H11 class, request/response events, default onError/onNotFound
    radix/           the radix router
  static/            file serving: serveFiles, file lookup, content-type
  server/            the adapter for Bun.serve
  connect/           the bridge to connect middlewares
  compress/          file pre-compression
  cookies/
  data-module/       modules that extend the shape of ctx.data
  modules/           size-limit, proxy
  utils/             join, req, switch, content-type, ip
```

## License

MIT — see [LICENSE](./LICENSE). Copyright 2026 Aleksey Malyuta.

## Security

Found a vulnerability? Report it privately, not in an issue — see [SECURITY.md](https://github.com/utftu/h11/blob/master/SECURITY.md).

Source: [github.com/utftu/h11](https://github.com/utftu/h11)

Maintainer: Aleksey Malyuta (@utftu)
