# h11-x

SSR/hydration on top of [`h11`](../h11) + Vite + [regan](https://www.npmjs.com/package/regan). An experimental, actively changing layer (version `0.0.x`) — for a working example see [`h11-x-example`](../h11-x-example).

## The route file convention

Every SSR route is a folder with three files (the extension is `.tsx` or `.ts`, both are checked):

```
routes/about/
  about.tsx         # the regan component itself
  about.ssr.tsx      # export const page — renders the component into HTML on the server
  about.client.tsx    # hydrates the same component in the browser
```

The client file is mandatory for any route; the server one (`.ssr.`) is optional, routes without it simply do not take part in the SSR build.

## Quick start

```ts
// server.ts
import { getInit, createServer } from 'h11';
import { getAbsolutePath } from 'utftu';
import { createApp, renderSsr } from 'h11-x';

const app = await createApp({
  baseDir: getAbsolutePath('../.h11x', import.meta),
  routes: [getAbsolutePath('./routes/about', import.meta)],
  prod: false, // true — production mode: no vite dev server, prebuilt bundles
});

app.h11.get('/about', async () => {
  const renderHtml = await renderSsr({ app, name: 'about', props: {} });
  return new Response(renderHtml(), getInit('html'));
});

// The spread hands Bun.serve both fetch and the websocket table — the dev
// server's HMR channel runs over the latter.
Bun.serve({ port: 3000, ...createServer({ h11: app.h11 }) });
```

`createApp` takes care of: starting the vite dev server (in dev), building the SSR/client bundles, the dev proxy to vite, serving the built static files. Registering the actual routes and the rendering itself is up to the caller, no magic.

It returns `{ h11, vite?, config, root, baseDir, close }` — `h11` to register your own routes, `vite`/`config` are only needed if you render by hand through `renderSsr`. `close()` shuts down the vite dev server together with the local host of the HMR channel; in production it is a no-op.

### `createApp` options

| Option           | Default                                 | What it does                                                                                                           |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `routes`         | auto-discovery in `${root}/src/routes`  | A list of paths to route folders (or `{ dir, name }`)                                                                  |
| `root`           | `cwd()`                                 | The project root: `.env` is read from here, `.h11x` is put here, and it also becomes vite's root in every build and in the dev server |
| `baseDir`        | `${root}/.h11x`                         | The build directory. In dev it is wiped on every start, so nothing of your own may be put there                        |
| `prod`           | from `NODE_ENV`, otherwise an error     | `false` — dev mode with the vite dev server and HMR; `true` — reads the finished build, see below                      |
| `prefix`         | `/h11x`                                 | The URL prefix for serving the built static files                                                                      |
| `devPrefix`      | `/_vite`                                | The prefix where vite itself is mounted (before `prefix`)                                                              |
| `url`            | —                                       | The application's public address (`https://nopeople.local.dev`). Only needed in dev behind a reverse proxy, see below  |
| `viteBase`       | `() => ({})`                            | The shared piece of the vite config: mixed into the dev server and into every build                                    |
| `editViteConfig` | identity                                | A hook for tweaking the config of a single build: `({mode, target, route}, config) => config`                          |
| `log`            | `{}`                                    | A line in stdout per request: `{static, query}` or `false`. Assets and the query string are not printed by default, see below |
| `health`         | `{}`                                    | `/ping` and `/ready` (GET and HEAD). `{checks}` — readiness checks, `false` — leave these paths alone                  |
| `h11`            | a new `H11()`                           | Pass an existing instance instead of creating a new one                                                                |

## `.ssr.tsx` — rendering on the server

```tsx
// about.ssr.tsx
import { createPage } from 'h11-x';
import { About } from './about.tsx';

export const page = createPage(About);
```

`createPage(Component)` returns `(props) => string` — it renders the component through regan's `stringify`, automatically passing the public environment variables into `data.envs` (see below) and the given `props` into `data.props`.

## `.client.tsx` — hydration in the browser

```tsx
// about.client.tsx
import { hydratePage } from 'h11-x/client';
import { About } from './about.tsx';

hydratePage(About);
```

Inside the component the data put there on the server is available through the FC's second argument: `(props, { globalCtx }) => { globalCtx.data.props; globalCtx.data.envs; }`.

## `h11-x/client` — the remaining components

- `Template` — wraps the content into `<!DOCTYPE html><html>...`, inserts `<Script/>` (the placeholder for injecting script tags) and `<DataSet/>` (serializes the render data into a `<template>` for hydration). Its own props are spread as attributes onto `<html>` — that is where `lang` and `dir` belong, without them the browser does not know the language and rtl cannot be turned on. Render data is not passed through props: it comes from the render, not from the markup.
- `Head` / `Body` — children of `Template`, they add content/attributes to `<head>`/`<body>`. Fragments between them and `Template` do not get in the way, but from inside your own component they do not work: `Template` takes their content without executing the components themselves, so a `Head` that made it into the render is a lost `Head`, and it throws instead of silently drifting into `<body>`.
- `getStorageHtml()` — on the client, reads and parses the `data` written by `<DataSet/>`.
- `hydratePage(Component)` — see above.

## Root styles

The file `src/styles.css` in the project root is picked up on its own and attached to every page — this is where fonts, variables and a css reset go. In production it is built into a separate file with a hash in its name and comes first among the `<link>`s, before the route's styles, so that the route can override them. In dev it is served by the same vite, with HMR.

No file — nothing is attached, no errors.

This is also where tailwind goes: it will be built into that same shared file and reach every page. Plugins scan the content from `root` (the project root) and not from the directory the process was started in — so `src/routes` makes it into the build no matter how you start.

In dev it is attached as a link with `?direct` — for such a request vite returns ready css, and the browser gets the styles together with the markup, without a flash. Hot replacement works: on a file change vite sends a `css-update` for that same path, and its client swaps the `<link>` itself.

## Route styles in dev

A route's styles are attached with the same `?direct` links, right after the root ones. In dev there is no file list — there was no build — so before rendering h11-x walks vite's module graph: it transforms the route's client entry and recursively follows its imports, collecting everything with the extensions `.css`, `.scss`, `.sass`, `.less`. That is how the styles of shared components are found too, not only the ones the client file imports itself.

The css import inside the module stays in place, so in dev the same styles arrive a second time as a `style` tag. The content is identical, there is no visible difference; hot replacement works both for the link and for that tag.

## The HMR channel

The hot replacement channel runs over the same address as the page: `wss://site/_vite/h11x/`, same host, port and protocol. This needs no configuration at all — neither a route in the reverse proxy nor a separate port exposed. The socket itself does not even need `allowedHosts`: we connect to vite from `127.0.0.1`, and it does not check the host. (Ordinary http requests behind a proxy do still need `host` — they go through vite's middlewares.)

Inside, this is two sockets. The browser upgrades at our end, h11-x opens a second socket to a local host on `127.0.0.1` with a random port and shuffles frames between the two. The local host is an empty `node:http` that only exists so that vite can do its handshake over it: the HMR protocol is implemented by vite, not by us.

There is one more reason for that host. In middleware mode vite, given no server, starts its own on port 24678 and bakes that port into the client — the browser goes past the application's origin, and behind an https proxy the channel does not come up at all (the port is not exposed, and the browser blocks `ws://` from a page served over `https`). Any server passed in removes the port from the client, and it connects back to wherever it got the page from.

There is one requirement on the application: `Bun.serve` must get not only `fetch` from `createServer` but `websocket` too — the easiest way is a spread, as in the example above.

## `/ping` and `/ready`

`createApp` registers two service paths on its own, each for `GET` and for `HEAD`:

| Path     | What it means | The answer                                    |
| -------- | ------------- | --------------------------------------------- |
| `/ping`  | liveness      | `200`, the text `pong`, always                |
| `/ready` | readiness     | `200` `[]` or `503` `["db","redis"]`, as json |

Liveness — the process is alive and answering; it goes nowhere and depends on nothing. Readiness — the dependencies are in place. The split is not cosmetic: in Kubernetes `livenessProbe` restarts the container while `readinessProbe` removes it from load balancing. A dead database must not restart a healthy process, which is why checks live in readiness only.

The names are plain, without `healthz`: the Kubernetes convention with its non-word letter `z` is kept by its own components (`kube-apiserver`, `kubelet`), while nobody polls pods by it — Kubernetes has no default probe paths at all. Explaining such a name costs more than naming the thing plainly.

Both methods, because monitors and load balancers send both `GET` and `HEAD`, and in h11 a `HEAD` does not reach a GET route — every method has its own table, and the answer would be a `404`. `OPTIONS` is not registered. The body for `HEAD` is cut off by Bun itself, the headers stay.

### Checks

Without `checks` readiness boils down to liveness — just a `200` and an empty list. With them:

```ts
const app = await createApp({
  health: {
    checks: {
      db: () => db.execute('select 1'),
      redis: () => redis.ping(),
    },
  },
});
```

- A check that **threw or returned exactly `false`** means the dependency is not ready. Any other value (including `0` and `''`) counts as success, which is why `() => db.execute('select 1')` fits as it is, without wrappers.
- Checks run in parallel: they are independent, and the probe has to finish before the monitor's timeout. There is no timeout of our own — the one polling us has it, and a hung check is just as much a failure to them.
- The body is a json list of the names that are not ready, in declaration order: `[]` on success, `["db","redis"]` on failure. The shape is the same in both cases, so a monitor does not have to parse two different answers — reading the list is enough.
- The body holds **names only**. The error text does not go there — `/ready` is open to anyone who reached the application, and a driver's message carries the connection string.
- The reason is printed to stdout as a single line: `ready: db — connection refused`. Without a stack trace, and it is printed even with `log: false` — this is a failure, not traffic.

A dependency belongs in readiness only if without it the pod cannot serve a single meaningful request: there is one database for all the pods, and when it goes down all of them become not ready at once, leaving the service with zero addresses.

The paths are not needed or are taken by the application — `health: false`, and then neither one is registered. They are registered before the application's routes, so somebody else's `/**` will not swallow them.

### Who polls them

Nobody, until you configure it. Kubernetes probes have no default paths, and Caddy's active checks are off until `health_uri` is set. And mind this: in `httpGet` the `path` field defaults to `/`, so without an explicit `path` the probe will hit the root.

```yaml
startupProbe:
  httpGet: { path: /ping, port: 3000 }
  periodSeconds: 2
  failureThreshold: 30 # up to a minute to start

livenessProbe:
  httpGet: { path: /ping, port: 3000 }
  periodSeconds: 10

readinessProbe:
  httpGet: { path: /ready, port: 3000 }
  periodSeconds: 5
  timeoutSeconds: 3 # we reach the database inside, the default second is not enough
```

```
reverse_proxy localhost:3000 {
  health_uri /ready
  health_interval 10s
}
```

Successful probes do not reach the log (see "The request log"), a `503` does.

## The request log

`createApp` subscribes the logger to the h11 instance's `response` event itself, and the application prints a line for every request:

```
GET 200 /about 56.5ms 203.0.113.7 72ab8272
GET 404 /nope 0.2ms 203.0.113.7 83768022
POST 500 /api 12.4ms 203.0.113.7 9ab31c02
Error: everything broke inside
    at ...
```

Method, status, path, time, ip, the first 8 characters of `reqId` — those are what you grep by, the full one sits in the event. The status comes right after the method: that is what the eye scans the line for, while a path can be of any length. The stack trace goes on a second line and only when a handler threw. An unknown ip is printed as a dash, so that the fields do not shift.

The ip is taken from `x-forwarded-for`, and only if the header is missing — from the socket address (`getIp` in h11). Behind a reverse proxy the socket always holds the proxy itself, hence the order. The header comes from the client, which means it can be forged if the application can be reached directly; tolerable for a log, but no decisions may be made by that ip.

**Successful health probes are not printed.** `/ping` and `/ready` with a status below 400 do not reach the log and have no switch: a monitor knocking every five seconds is 17 thousand identical lines a day, and there is nothing to look at in them. A `503` and errors are printed by the general rule.

**Successfully served assets are not printed.** Everything under `prefix` and `devPrefix` that is not a page stays out of the log: in dev a single page load is about thirteen requests to vite, and the useful lines drown in them. Errors on those same paths are always printed — a missing asset has to be visible.

**The query string is not printed.** One-time tokens from links like `/signin?token=...` end up in the query, and a log is a file that lives long and is read by many.

Both rules have switches:

```ts
const app = await createApp({
  log: { static: true, query: true },
});

// Or stay silent altogether:
const app = await createApp({ log: false });
```

If you need your own format or your own filter — `log: false` and your own subscription to `response`, see "Events" in the [h11 README](../h11#events).

## Localization — strings are baked into the page

The locale is picked at build time with an alias, the strings are taken by imports from ts files, and a page's bundle receives **only the keys it actually uses**. The rest of the catalog, the other pages and the other languages do not travel into it.

```ts
// h11x.ts
const locale = Bun.env.LOCALE ?? 'ru';

const app = await createApp({
  viteBase: () => ({
    resolve: { alias: { '@locale': `${root}/src/locales/${locale}` } },
  }),
});
```

```json
// tsconfig.json — the reference locale types the keys in every component
{ "compilerOptions": { "paths": { "@locale/*": ["./src/locales/ru/*"] } } }
```

```ts
// src/locales/ru/common.ts
import { plural } from '../plural.ts';

// One rules object per file: the file knows its language, there is no need to
// build them on every call. They are created on import, which means only for
// the pages that need the file.
const rules = new Intl.PluralRules('ru');

export const locale = 'ru';
export const submit = 'Отправить';

export const comments = (count: number) =>
  plural(rules, count, {
    one: '# комментарий',
    few: '# комментария',
    many: '# комментариев',
  });
```

```ts
// src/locales/plural.ts
export const plural = (
  rules: Intl.PluralRules,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>>,
) =>
  (forms[rules.select(count)] ?? forms.other ?? '').replace('#', String(count));
```

```tsx
// src/routes/signin/signin.tsx
import { Template } from 'h11-x/client';
import * as t from '@locale/signin.ts';
import * as c from '@locale/common.ts';

export const Signin = () => (
  <Template lang={c.locale}>
    <h1>{t.title}</h1>
    <p>{c.comments(5)}</p>
    <button>{c.submit}</button>
  </Template>
);
```

A locale file knows its own language (through the `locale` key), so `<html lang>` needs no separate channel. Plural forms are worked out by `Intl.PluralRules` — in Russian those are `one`, `few`, `many`, and the rules come with the browser, no tables of your own needed.

### What gets cut and what does not

The bundler cuts **by exports, not by object properties**. If an object is mentioned, it travels whole — the bundler cannot take a literal apart. Measured on a single build:

| Catalog shape                                           | What ends up in the bundle                   |
| ------------------------------------------------------- | -------------------------------------------- |
| `export const messages = {signin: {...}, about: {...}}` | **everything**, other pages included         |
| `export const signin = {...}` per namespace             | only `signin`, but whole, with unused keys   |
| flat `export const title = '...'`                       | only the key that was used                   |

So the catalog is flat exports, and the nesting at the call site comes from a namespace import:

```tsx
import * as t from '@locale/signin.ts';

t.title; // reads like nesting, gets cut per key
```

### Ts, not json

Json works too — vite turns it into a module with named exports, and the extra keys are thrown away just the same. But you cannot put functions into json, and functions are exactly what plurals, interpolations and dates need. So the catalog is ts.

One rule is mandatory with it: **ordinary functions, not factories.**

```ts
// like this — cut out if the page does not use it
export const files = (count: number) => plural(rules, count, { one: '# файл' });

// like this — always stays in the bundle, and runs on load too
export const files = createPlural('ru', { one: '# файл' });
```

The bundler cannot prove that a module-level call is harmless, so it keeps both the call and its strings. A `/*#__PURE__*/` mark before the call cures that, but leaning on a comment that is easy to forget is a poor foundation: forget it once, and dead strings travel silently.

### Checking that the locales have not drifted apart

Five lines, and a mismatch becomes a compile error:

```ts
// src/locales/check.ts
// Strings differ between locales by definition, so the literals are widened to
// string. Function signatures stay as they are — those are what must match.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : T[K] };

type Ru = Widen<typeof import('./ru/common.ts')>;
type En = Widen<typeof import('./en/common.ts')>;

export const checkEn: Ru = null as unknown as En;
export const checkRu: En = null as unknown as Ru;
```

This catches a forgotten key (`Property 'submit' is missing`), an extra key and a drifted signature (`(count: string) => string is not assignable to (count: number) => string`). Different translations of the same key are not an error.

### What follows from this

Measured on two routes with a shared catalog: the `signin` bundle holds only its own title, the string it used from the shared file and the forms of the plural it used. No `about` title, no unused hint, no extra plural, no English strings. The same in the route's server module.

**The catalog may grow as large as it likes** — only what is touched reaches a page, and there is no need to keep track of "what to load on which page": every route is built by a separate build with its own graph.

Slicing by namespace (`locales/ru/{common,signin,about}.ts`) is then not about bytes but about human convenience.

Three consequences worth knowing up front:

- **The keys are flat.** `@locale/signin.ts` + `t.title`, but not `t.signin.title`: named exports only exist at the top level.
- **A missed key is a compile error**, provided the alias is added to `paths`: `Module has no exported member`.
- **The language is fixed at build time.** In a deployment that is a build argument and one image per language. Several languages in one deployment cannot be done this way: that would need a client build per locale, which h11-x does not have yet.

If the locale is needed **at runtime** rather than at build time, the strings cannot be baked in — then the locales sit next to the route and are loaded as a chunk: `` await import(`./locales/${locale}.ts`) ``. Vite will lay them out as separate files, the browser will download one and cache it by hash; the main bundle will hold no strings at all.

## `.env` and environment variables

On every `createApp` call the `.env` from the project root (`${root}/.env`) is loaded automatically, if the file exists — parsed through `parseEnv` from `node:util`, and it does not overwrite variables already set from the outside (the deployment environment wins).

### `getEnv` — one function for both ends

```ts
import { getEnv } from 'h11-x/client';

export const About = () => <h1>{getEnv('PUBLIC_APP_NAME')}</h1>;
```

A shared component is rendered both on the server and in the browser, so a variable has to be read the same way from both sides. On the server `getEnv` takes it from the process environment (`Bun.env`), in the browser — from what the server put into the markup. No such variable — `undefined`.

It is exported from both entry points: from `h11-x/client` for components, from `h11-x` for server code.

**`PUBLIC_*` only.** A name without the prefix throws, and the reason is not leaking secrets but divergence: a server-only variable exists on the server and does not exist in the browser, so a shared component would render two different trees — and hydration would drift apart silently. Secrets are read with `Bun.env` directly, in code that only ever runs on the server.

### What travels to the client

In SSR (`createPage`) the payload holds **only** the variables prefixed with `PUBLIC_` — the rest stay server-only and leak neither into the HTML nor into the client JS. The payload sits in `<template id="h11x_storage_id">`, which `Template` always renders into `<head>`; it can be read whole with `getStorageHtml()`.

On the client the values live in `window.h11x.envs` — visible with one expression in the console and available to more than just our own code:

```js
window.h11x.envs; // { PUBLIC_APP_NAME: 'h11x-example' }
```

`hydratePage` fills it before rendering. If `getEnv` is called before hydration, it takes the values from the markup itself and puts them there too — otherwise at module top level it would return `undefined` where the server returned a value.

### Why not `import.meta.env`

Vite can do `VITE_*`, and it works, but it **bakes the values into the bundle at build time**. An image built once and run with different environments cannot be done that way: whatever was in CI would be inside it. So `PUBLIC_*` are handed over at runtime, on every response.

One exception is unavoidable: ssg pages are rendered at build time, which means `PUBLIC_*` freeze into their html right there.

See [`.env.example`](../h11-x-example/.env.example) in the example.

## `viteBase` — the shared vite config

We have four vites: the dev server and three builds (styles, the route's client, the route's server module). Everything that all of them need — plugins first of all — is stated once:

```ts
const app = await createApp({
  url: Bun.env.APP_URL,
  viteBase: () => ({ plugins: [tailwind()] }),
});
```

`buildH11X` accepts the same thing — on a build machine the plugins are needed just as much.

A function and not an object, for one reason: there are four configs, route builds run in parallel, and plugins with state of their own (tailwind among them) do not promise that one instance will serve everybody. `viteBase` is called once per config, and each one gets fresh ones.

The route's server build takes the aliases from `viteBase` into account as well: by default everything is treated as external except relative paths, the project's absolute paths and alias names. Without that, `import {x} from '@locale'` would stay an import in the built module — the build would pass silently and production would crash on startup. An application can still decide externality itself: its own `build.rollupOptions.external` in `viteBase` cancels our rule entirely.

Our config always wins: `root`, `base`, `middlewareMode` and the ws channel server cannot be overridden. Arrays are concatenated — the application's plugins come after `reganVite`. Settings under `server` only apply in dev, under `build` only in builds: vite ignores the other half itself, so there is no need to separate them.

## `prod` — the mode

It is passed as a parameter, and if it is not passed — taken from `NODE_ENV`:

| `prod`           | `NODE_ENV`            | mode                    |
| ---------------- | --------------------- | ----------------------- |
| `true` / `false` | anything              | whatever was passed     |
| not passed       | `production`          | production              |
| not passed       | `development`         | dev                     |
| not passed       | empty or something else | **startup error**     |

The last row is deliberate. There must be no silent "nobody said anything, so it is dev": in a production image that means wiping the finished build and starting a vite dev server. So an unclear mode fails the startup, and `buildH11X` resolves it before it deletes the build directory.

In `createApp` the mode is read after `.env` is loaded, so a `NODE_ENV` from the project file counts too (the deployment's environment variables still win over the file).

Internally it uses `Bun.env` and not `process.env.NODE_ENV`: the latter is folded into a constant by `bun build` when the package is built, and the published `dist` once ended up with a hardcoded `prod = false` — a production start then raised a dev server and wiped the build.

## `url` — the application's public address

It is needed in one case: in dev the application is opened not at `localhost` but at your own domain through a reverse proxy. Vite checks the `Host` header and rejects a domain that is foreign to it — without this option all the static files in dev answer 403 `Blocked request`.

```ts
const app = await createApp({ url: Bun.env.APP_URL }); // https://nopeople.local.dev
```

It accepts a whole url — that is exactly the form the address usually has in the environment; only the domain goes to vite. The option is a dev one: in production there is no vite, and `url` is not used.

Vite's check is not there for decoration: without it an attacker's page with dns rebinding to `127.0.0.1` would pass our router, reach the dev prefix and read out the project's sources. That is why we do not default to `allowedHosts: true`.

## `editViteConfig`

It is called before every vite build and gets two things: what is being built, and the config itself.

```ts
const app = await createApp({
  editViteConfig: ({ mode, target, route }, config) => {
    // mode   — the route's mode: 'ssr' | 'ssg'
    // target — what is being built: 'server' | 'client'
    // route  — the {dir, name} of the route this build is for

    if (target === 'client') {
      config.build!.sourcemap = true;
    }

    return config;
  },
});
```

The axes are independent, so any combination of them can be configured — for example only the server builds of ssg routes, or one specific route by name. Whatever is common to all goes into `viteBase`; this hook stays for the particulars.

## Low-level primitives

If `createApp`/`createPage` do not fit the task, more primitive functions are available:

- `buildH11X({ root, baseDir, routes, prod, prefix, devPrefix, viteBase, editViteConfig })` — the build only (without creating an `H11`/vite dev server).
- `readConfig(baseDir?)` — reads `.h11x/config.json` written by the build: `{ prod, prefix, devPrefix, routes }`, where every route is `{ mode: 'ssr' | 'ssg', client: { src, out }, server: { src, out } }`, and an ssg one also has `pages: [{ pathname, file }]`. `src` is the source, `out` is the build result: for the client an object with lists (`js`, `chunks`, `css`, `assets`), for the server a single built module.

There are no absolute paths in the config: `src` is counted from `root`, `server.out` and everything in `client.out` — from `baseDir`. That is why a build directory can be assembled in one place and run in another.

`createApp` builds the project in dev only. In production it reads the finished `config.json`, and the build is a separate step:

```ts
// the build machine
await buildH11X({ root, prod: true });

// the live one: the same directory at another path, vite is not started
const app = await createApp({ root, baseDir: '/srv/app/.h11x', prod: true });
```

- `makeSsr(...)` / `makeSsg(...)` — building the routes of one mode; both return their part of `routes` and write nothing, the config is assembled and written by `buildH11X`.
- `defaultPrefix` (`/h11x`) and `defaultDevPrefix` (`/_vite`) — the defaults of the options with the same names.
- `renderSsr({ app, name, props })` — renders a specific route by name (what the example above uses). In production it puts all of the route's CSS files (`<link rel="stylesheet">`) and its entry scripts in place of `<Script/>`.
- `getAssets(app, name)` — the whole output of the route's vite build with ready URLs: `{ js, chunks, css, assets: [{ src, url }] }`. `src` is the file's path relative to the route folder (`logo.svg`, `icons/logo.svg`), and the page finds the asset it needs by it if it wants to insert a `<link rel="preload">` itself. h11-x does not insert preload tags: only the application knows which file matters for the first screen. **In dev mode the lists are empty**: ssr routes are not built there, everything is served by vite from the sources.

A route in ssg mode (`<name>.ssg.{ts,tsx}` next to `<name>.client.{ts,tsx}`) is rendered once at build time: the HTML lands in `.h11x/assets`, and ordinary static serving hands it out — `/blog` finds `assets/blog.html` on its own, there is no need to register such a route in `H11`. `renderSsr` on an ssg route throws: there is nothing to render there.

Such a file exports `pages` — a list of pages with ready markup:

```tsx
const page = createPage(Blog);

export const pages = [
  { pathname: '/blog', html: page({}) },
  { pathname: '/blog/first', html: page({ slug: 'first' }) },
];
```

`html` may be a promise, and `pages` itself may be one too (`export const pages = loadPosts()` or a top-level `await`) — the build waits for both.

## Build

```bash
bun run build   # two entry points: h11-x.ts (--target bun) and h11-x.client.ts (--target browser)
bun run types
```

## Layout

Every entity is a folder with its own file and a test next to it.

```
src/
  h11-x.ts          the server entry point, re-export only
  h11-x.client.ts   the browser entry point, re-export only
  ssr.tsx           ssr in full: makeSsr, renderSsr, createPage
  types.ts  consts.ts
  app/              createApp
  build/            buildH11X, the vite builds, detecting route modes
  ssg/              ssg in full: makeSsg and laying pages out into files
  assets/           parsing vite's output, config.json, getAssets, tags
  client/           Template, Head, Body, hydration, getEnv
  routes/           discovering routes by convention
  health/           /ping, /ready and the readiness checks
  log/              the log line and the asset filter
  env/  utils/
```
