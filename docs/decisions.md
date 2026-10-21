# Decisions

What was decided and why. Entries are edited in place, dead ones are deleted.

## Monorepo

**Bun-only runtime.** The `FsApi` abstraction with providers for Bun and Node is gone, the `h11/bun` and `h11/node` entry points are collapsed into a single `h11`. The file system is called directly — `Bun.file`, `Bun.write`, `node:fs/promises`.
Why: there were two providers, but the Node branch did not work at all (the built `dist/h11.js` would not import under Node), while the abstraction cost nine interface methods and duplication between the providers.
Rejected: fixing the Node branch and keeping both — maintaining what nobody uses.

**Documentation is in English: the READMEs of every package and this file.**
Why: the packages are published to npm, and English is the language of their readers. The working dialogue stays Russian.

**A package's entry point is a re-export only.** `h11.ts`, `h11-x.ts`, `h11-x.client.ts` hold no logic.
Why: `buildH11X` lived in h11-x's entry point and dragged a circular import with `app.ts` behind it.

## Repository — packaging and CI

**MIT, one `LICENSE` at the root and a copy in every published package.** Copyright 2026 Aleksey Malyuta.
Why a copy: npm puts `LICENSE` and `README.md` into the tarball on its own, even with `files: ["dist"]` — measured on `npm pack --dry-run` — so a package is self-contained without listing them.

**One `SECURITY.md`, at the root only.** Private reporting through GitHub Security Advisories or by email, an answer within 7 days, and only the latest release of each package is supported.
Why not per package: npm does not show `SECURITY.md` at all, and it is not in the tarball; two copies would drift apart. Both package READMEs link to the root one by absolute url, so the link survives on npmjs.com.
Cost: the advisory link only works for outsiders once private vulnerability reporting is switched on in the repository settings.

**Dependency ranges are explicit, `*` is not used.** `utftu: ^1.0.33` in h11, `h11: ^1.0.20` in h11-x.
Why: `*` means any future major, so a published package would break on somebody else's release. The workspace link survives — bun links the local package while its version satisfies the range.

**`vite` stays `>=8`, deliberately wide.** It is a dependency in name only: h11-x and the application must end up with one vite instance.
Why: with a narrow range npm nests a second copy next to the application's vite, and the dev server breaks on two module graphs. A wide range lets the resolver dedupe to the application's one.

**CI builds before it tests** (`.github/workflows/test.yml`: `bun install --frozen-lockfile`, `dapes x build`, `bun test`).
Why: measured on a clean checkout — the h11-x tests build real projects that import `h11` and `h11-x` by name, those names resolve to `dist`, and without a build two tests fail on a missing entry point. Locally it passes only because `dist` is already there.

**Test project directories are removed in `afterEach`, not at the end of the test.** `trash.push(path)` at creation, one `afterEach` per file.
Why: cleanup as the last statement of a test is skipped whenever the test fails — 19 `.test-project-*` directories had piled up inside the package that way.

## h11 — the router

**All matching routes are collected and tried in order.** Priority: the exact path, then the parametric one, then `/**` from the deepest to the most general. A route whose handlers returned `undefined` yields to the next one.
Why: three models coexisted in the router — middlewares chained, wildcards of different depth chained, and exact paths did not. A developer expects one behaviour from all of it.
Cost: +4–9% to lookup time (167 → 174 ns on a static path), a list of candidates instead of a single pair in `find`.
Rejected: keeping "one route wins", like fastify — it does not solve the original problem with `/**`.

**Middlewares run once, before the candidates.** `find` returns them as a separate list.
Why: inside the candidates a middleware that read the request body would run again on a drained stream.
Cost: a middleware sees the `params` of the most exact candidate, not of the one that answered.

**Registering a path again appends handlers to the end.** Previously a second `get('/a')` silently overwrote the first.

**A pattern must start with a slash and may not end with one.** The root `/` is the exception.
Why: `add('users')` silently created a node `sers`, and `'/users/'` an empty trailing segment.

**A trailing slash in the incoming path is trimmed:** `/hello/` finds the route `/hello`.
Why: to a client it is the same address, and a 404 on it looks like a breakage.

**Two different param names at the same level are a registration error.** A node stores a single parametric child, and the second name used to be lost silently.

**Modules extend the shape of `ctx.data`, and their marker is mandatory.** `createDataModule<{user: User}>(handler)` marks a middleware, and after `.use(authModule)` the instance knows about `data.user`.
Why: the `__adds` marker was optional, any handler matched `DataModule`, and `TData` got extended with garbage on any `.use()`. A mandatory marker plus a helper cast fixes the selection without losing the capability itself.
Rejected: dropping data modules entirely and setting the shape only through the class parameter — that loses the typing of whatever auth and similar modules put there.

**`reqId` lives only in `ctx.reqId`.** The `createReqIdModule` module, which put the same value into `data.reqId`, is deleted — two sources for one value.

**Route params are not decoded:** `/users/a%20b` yields `a%20b`.
Why: what was sent is what we hand over; paths in the project are latin-only.

## h11 — websockets

**`createServer` returns the pair `{fetch, websocket}`** — `Bun.serve({port, ...createServer({h11})})`.
Why: `Bun.serve` wants the websocket callback table up front, separately from `fetch`. One name instead of two, and you cannot forget half of it.
Cost: breaks `fetch: createServer({h11})` in every application — one line per application.
Rejected: a separate `websocket` export (two names, half of it can be forgotten) and a function with a `.websocket` field (hidden assignment).

**A websocket is declared by an ordinary handler through `ctx.upgrade({open, message, close})`.**
Why: routing, middlewares, params, `data` modules and falling through the chain already work — a second routing circuit is not needed. Connection state lives in the handler's closure, so a connection does not need to carry `data` of its own.
Rejected: `h11.ws(path, handlers)` — a pseudo-method in the radix, static callbacks with no access to `params`, and a separate question about middlewares.

**A successful upgrade is returned by the handler as a response with status 101, and `createServer` turns it into `undefined`.**
Why: after an upgrade Bun expects exactly `undefined` from `fetch`, while the core needs a non-empty response — otherwise the handler counts as having declined and the turn moves on. The whole agreement lives in `server.ts`: both the side returning the 101 and the side reading it.
Rejected: a symbol marker — it would leak into `exec`'s type and into everybody who calls it.

**`upgrade` is a mandatory parameter of `exec`.** The core cannot do upgrades and cannot invent one of its own: the provider gives it.
Why: the default value was a stub that threw — a hidden branch of behaviour in the core for the sake of those who call `exec` by hand. A mandatory parameter says the same thing with a type, before anything runs.
Cost: manual `exec` calls pass `upgrade: () => undefined` — that means the tests, and that is all.
Rejected: a quiet default of `() => undefined` in the core — the handler would silently fall through, and the request would end in a 404 for no reason.

**`Sec-WebSocket-Protocol` is not set by hand.** Bun echoes the subprotocol the client asked for itself; a duplicated header closes the connection with code 1002 (`Mismatch client protocol`) — measured.

## h11 — static file serving

**`serveFiles` does not answer with a 404 of its own.** No file — the handler stays silent and the request goes on to the application's `onNotFound`.
Why: a custom `onNotFound` did not work for static files, and the 404 code duplicated `errors.ts`.

**Besides the exact match, `<path>.html` and `<path>/index.html` are looked up**, including in their pre-compressed variants.
Why: ssg pages are served at pretty urls (`/blog` → `blog.html`).

## h11 — API

**One family for mime, everything by path:** `getMime(path)`, `getMimeHeaders(path)`, `getInit(...)`. The old `getContentType*` by extension key is deleted.
Why: two families about the same thing, and from the outside it was not clear which to pick. A bare extension is the same as a path: `getMime('.html')`.

**`getInit` has two forms:** the positional `getInit('json', 200, headers)` and the object one `getInit({mime, code, headers})`. The work is the same, with a shared `createInit` inside.
Rejected: the names `getResponseProps`, `getMimeConfig`, `getMimeProps`, `getProps` — too long or unclear.

**The body size limiter: the limit is inclusive.** An excess visible in `content-length` means an immediate 413; an excess found mid-stream tears the body read with `BodyTooLargeError`, which `onError` catches.
Why: the boundary disagreed with itself (`>` versus `>=`), and the error was swallowed by `.catch(() => {})`.

## h11 — events

**The events are emitted by the core, not by the handlers.** From `exec`, in every branch: a handler answered, a `Response` was thrown, `onNotFound` kicked in, `onError` kicked in. The status is read from the real `res`.
Why: the `code` event used to be emitted by the default `onNotFound` and `onError` themselves, and the very first thing done in production — a custom `onError` — silently killed the only signal about errors.

**The `code` event is deleted, the default handlers now only answer.**
Why: it had become a strict subset of `response` — `code` is `res.status`, `error` is the same, and `text` is assembled from `req.url` and `error.message`. And of the three events it was the only one that disappeared the moment you wrote your own `onError`, meaning we were documenting a trap instead of removing it.
Its only distinguishing feature — a ready, safe `text` for the client — never worked: the default `onError` puts `Internal Server Error` into the body, while `text` went into the event only.
Cost: it breaks for anyone subscribed from outside the monorepo. The replacement is a subscription to `response`, where the status and `error` are the same.

**There are two of them: `request` before handling, `response` after.**
Why: a request that hung or killed the process will never arrive at `response` — the only way to see it is a `request` without a pair. And `request` is also the place where a trace begins.
Cost: two `emit`s per request instead of one, and two shapes in the types.
The time is counted from `request` and not after it: a subscriber is called synchronously, and a slow subscriber is also request time, with no reason to hide it.

**The shape is raw: `{req, reqId, providers}`, and the same plus `{res, ms, error?}`.** Nothing is picked in advance, whoever prints digs out what they print.
Why: with a pre-parsed set of fields every new field would be a new version of the API. `providers` is in the event so that a subscriber can reach the server (the ip comes from it).
Cost: subscribers are called synchronously, before `exec` returns, which means `res` can be spoiled from a subscriber.
The body of `exec` moved into a private `run` that returns `{res, error?}`: through a `finally` the response is not visible, and there are many returns in the body.
`error` only exists for exceptions: a 500 returned deliberately by a handler, and a thrown `Response`, are ordinary answers.

**There is no logger in h11, only the bus.** `createServer` subscribes nothing, and the README carries a ready eight-line subscriber.
Why: a log line is only interesting together with the policy of "what to print", and that policy needs to know which paths static serving owns and which answer is a page. The core does not know that, h11-x does.
Cost: bare h11 has no access log out of the box — one line of subscription is needed.

**`getIp` takes the first hop of `x-forwarded-for`, and only without the header — the socket address.** It stays in h11: this is about the request, not about the log.
Why: behind a reverse proxy the socket always holds the proxy itself. Measured: `server.requestIP(req)` returns only the connection address, which behind Caddy is `127.0.0.1`, meaning the ip in the log would be the same for every request.
Cost: the header comes from the client and can be forged if the application can be reached directly, bypassing the proxy. Tolerable for a log line, but no decisions may be made by that ip — that is written both in the README and in the file itself. A foreign value is cut at 45 characters, the ipv6 maximum.
An address like `::ffff:127.0.0.1` is normalized to `127.0.0.1`: that is how a dual-stack listener shows a client that arrived over ipv4 (RFC 4291), and it is the same address in ipv6 form. Measured: over `127.0.0.1` the socket returns `::ffff:127.0.0.1`, over `localhost` and `[::1]` — `::1`.

## h11-x — build and config

**One `.h11x/config.json` for ssr and ssg.** A route is `{mode, client: {src, out}, server: {src, out}}`, and an ssg one also has `pages: [{pathname, file}]`. `src` is the source, `out` is the build result.
Rejected: `entries` as the name for the build output (in a bundler's vocabulary an entry is an input), `clientLinks` (the object holds more than what becomes tags), the suffixes `-Raw`/`-File`.

**`pages` is kept in the config**, even though static serving would find the html without it.
Why: the ssg pages' routes are registered by name from it.

**The whole vite output is written into `config.json`**, not the first file: entry chunks, the rest of the chunks, css, assets.
Why: `output[0]` used to be taken, and css never made it into the production markup at all — pages went out without styles.

**The client build's path scheme is tied together rigidly:** `outDir` = the serving directory, `assetsDir` empty, `base` = the serving prefix.
Why: without `base` vite baked `/assets/...` paths into the css while the files were served at `/h11x/...` — fonts and images gave 404s.

**The route's server module is built with external dependencies:** anything that is not a relative and not an absolute path counts as external.
Why: there is no point dragging node_modules into a module we execute ourselves; as a bonus `h11-x/client` stopped landing in the bundle as a second copy. The route's bundle: 34 KB → 704 bytes.

**In dev, ssr routes are not built at all.** Rendering goes from the sources through vite.
Cost: `out` in the config is empty, and `getAssets` returns empty lists in dev.

**Vite's root for all three builds is the project root.** `root` is passed to `buildStyles`, `buildClient` and `buildServer` the same way as `baseDir`, `prefix` and `editViteConfig` — as a shared parameter.
Why: without it plugins counted the content from the process's working directory. Tailwind, hooked up through `src/styles.css`, would lose the classes from `src/routes` whenever a build was started from outside the project root. Vite also takes `vite.config` and `.env` from there, and the dev server already worked exactly that way — the builds lagged behind it.

**The shared piece of the vite config is a single `viteBase` parameter, mixed into all four vites** (the dev server and three builds). A function, not an object.
Why: plugins had to be declared twice — in `viteConfig` for dev and in `editViteConfig` for the builds. A function is needed because there are four configs, route builds run in parallel, and plugins with state of their own (tailwind) do not promise that one instance will serve everybody; this way each config gets fresh ones.
Our config is always `defu`'s first argument: it overrides foreign values, and arrays are concatenated in the same order — which is why `reganVite` comes before the application's plugins. Settings under `server` only work in dev, under `build` only in the builds, and vite ignores the other half itself.
Cost: `viteConfig` is deleted. As a bonus `reganVite` moved out of the shared constants into each build's config — previously a single plugin instance was shared by all the builds at once.

**`url` is the application's whole public address**, and the domain for the dev server's `server.allowedHosts` is taken from it.
Why: behind a reverse proxy vite rejects requests from a domain foreign to it — in dev all static files answer 403. A url and not a domain, because that is usually what sits in the environment (`APP_URL=https://nopeople.local.dev`), and there is no point parsing it on the application's side.
Rejected: `allowedHosts: true` by default — vite's check is a live one here and protects against dns rebinding, through which an attacker's page would read out the project's sources from the dev prefix (measured: a foreign `Host` gives 403, our own gives 200). Also rejected: leaving it to the application through `viteBase` — then every project behind a proxy would have to know vite's knob.

**`editViteConfig` receives `{mode, target, route}`.** Two independent axes instead of a glued `'ssr_server'`, plus the route itself — so that a specific one can be configured.

**The mode: `prod` as a parameter, otherwise from `NODE_ENV`, and an unclear value fails the startup** (`getProd` in `env.ts`).
Why: the default used to be `process.env.NODE_ENV === 'production'`, but `bun build` folds that expression into a constant when the package is built — the published `dist` held `prod = false`. Nobody could get production through the environment: a start with `NODE_ENV=production` raised a dev server and wiped the finished build.
Rejected: treating an unpassed mode as dev — that is the dangerous branch itself, and an image without `NODE_ENV` would wipe the build again. So empty or `test` is an error, not dev.
`Bun.env` and not `process.env.NODE_ENV`: bun does not fold the former (nor `process.env['NODE_ENV']`), measured on a build.
In `createApp` the mode is resolved after `loadEnvFile` — a `NODE_ENV` from the project's `.env` counts too. In `buildH11X` — before the `rm` of the build directory.

**The render mode is decided by `config.prod`, not by the presence of vite.** A mismatch between the build and the start is an error, and it must fail immediately.

## h11-x — the request log

**The logger lives in h11-x, and `createApp` subscribes it.** The line: `GET 200 /about 56.5ms 203.0.113.7 72ab8272`.
Why here: telling an asset from a page is only possible when you know `prefix` and `devPrefix`, and the application is what knows them. Why in `createApp` and not in `createServer`: `createServer` is called by the user, and two subscriptions in two places would give doubled lines.
The status comes right after the method: that is what the eye scans the line for, while a path can be of any length. The first eight characters of `reqId` are enough, the full one sits in the event. An unknown ip is a dash, so that the fields do not shift.

**A successfully served asset does not reach the log, `log: {static: true}` brings it back.** Noise is a path under `prefix` or `devPrefix`, an answer that is not `text/html`, and a status below 400.
Why: measured on `h11-x-example` — a single page load in dev is 13 lines, of which one is useful. After the filter 2 were left, and the second one was a crawler's artifact.
Why errors are always printed: a missing or failing asset has to be visible, otherwise the page will silently stay without styles.
Why html under the prefix is printed: ssg pages live in that same directory, and `/h11x/blog.html` is a page, not noise.

**The query string is not printed, `log: {query: true}` brings it back.**
Why: one-time tokens from links like `/signin?token=...` end up in the query, while a log lives long and is read by many. Losing the query for debugging is unpleasant, but a token leaked into the log costs more.

**`log: false` removes the subscription entirely.** If you need your own format — your own subscription to `response`.

**Two service paths, registered by `createApp`, the switch is `health: false`.** `/ping` — liveness, `200` `pong`, always. `/ready` — readiness, a json list of the checks that failed.
Why in h11-x and not in h11: the core does not take the application's paths by itself, while h11-x already takes `prefix`, `devPrefix` and the ssg pages' paths.
Why the checks are in readiness only: in Kubernetes `livenessProbe` restarts the container while `readinessProbe` removes it from load balancing. If a dead database brought liveness down, the cluster would start restarting a healthy process and make things worse.
Why without `healthz`: the convention with a non-word `z` is kept by Kubernetes' own components (`kube-apiserver`, `kubelet`), while nobody polls pods by it — probes have no default paths at all, the path is always named in the manifest. So the name is chosen by meaning and not by recognizability, and a second name for the same handler is not needed.
Rejected: `/healthz` next to `/ready` as an alias — it was done that way first and removed once it turned out that the recognizability was imaginary.
Why both methods: monitors send both GET and HEAD, and in h11 every method has its own table — measured, `HEAD /ping` on a GET route gives a `404`. `OPTIONS` is not registered: probes do not use it. The body for HEAD is cut off by Bun itself.
They are registered before the application's routes, otherwise somebody else's `/**` could intercept them.

**A check fails by throwing or by returning exactly `false`.** Everything else, including `0` and `''`, is success.
Why two ways: `() => db.execute('select 1')` fails by throwing and works as it is, while `() => pool.totalCount > 0` naturally returns a boolean. Demanding a `throw` from the second would mean writing a wrapper for every check.

**Checks run in parallel, with no timeout of their own.**
Why in parallel: they are independent, and the probe has to finish before the monitor's timeout. Why without a timeout: the one polling us has it, and a hung check is just as much a failure to them. By js-style, timeouts only live around `fetch`.
The order of names in the answer is the declaration order: `Promise.all` preserves it, and the body stays predictable.

**The readiness body is a json list of the names that are not ready.** `[]` on success, `["db","redis"]` on failure; the reason goes to stdout as a single line, `ready: db — connection refused`, without a stack trace.
Why a list and not `ok`/`fail: ...` as text: the shape is the same in both cases, and a monitor does not need to parse two different answers. `Response.json` sets `application/json;charset=utf-8` itself, and the body for HEAD is cut off by Bun — measured.
Why `/ping` stayed text: `pong` is the canon of ping, there is nothing to parse there.
Why names only: `/ready` is open to anyone who reached the application, and a driver's message carries the connection string. The driver's stack trace is useless anyway — the signal is in the message.
Cost: it is printed even with `log: false`, meaning stdout has two switches that disagree. It was chosen that way because a failure is not traffic: the reason behind a 503 must not be lost. Rejected: not printing at all and leaving it to the check's author — then there would be a 503 with no reason anywhere, and that is exactly the case people hunt for at night.

**A successful probe does not reach the log, and there is no switch for that.**
Why: a monitor every five seconds is 17 thousand identical lines a day, and not one of them says anything. A failed probe is printed by the general rule "a status from 400 up is always printed".
Rejected: a separate option to turn them back on — there is nothing to turn on, the lines are meaningless by nature.

## h11-x — environment variables

**`getEnv(name)` is one function for both ends and lives in the client entry point.** On the server it reads `Bun.env`, in the browser — what the server put into the markup. No such variable — `undefined`. It is exported both from `h11-x` and from `h11-x/client`.
Why the client one: a shared component (`about.tsx`) is rendered both on the server during SSR and in the browser during hydration, and it imports `h11-x/client` — so one function for both cases can only live there, branching on `typeof window` at runtime.
Measured that the branching is safe: in the client build vite leaves `Bun.env[name]` as it is, and the branch is dead in the browser. Whereas `process.env.NODE_ENV` it folds into the literal `"production"` — which is why the server branch uses `Bun.env`, just like `getProd`.
Why not a separate `client/env.ts` module: it would need `getStorageHtml` from `client.tsx`, and `client.tsx` would need `setEnvs` — an import cycle. The file is small and the topic is one; we will split it when it grows.

**`getEnv` reads `PUBLIC_*` only, everything else throws.**
Why: the reason is not a leak but divergence. A server-only variable exists on the server and does not exist in the browser — a shared component would render two different trees, and hydration would drift apart silently. Failing on the first call is cheaper.
The prefix moved into `consts.ts`: both sides need it, and duplicating the string in two files is not allowed.

**On the client the values live in `window.h11x.envs`.** `hydratePage` fills it before rendering; a `getEnv` called before hydration takes them from the markup itself and puts them there too.
Why window and not parsing the markup on every call: it is visible with one expression in the console, available to more than our own code, and reading is cheaper than `JSON.parse`. Cost: state in a global object — but the source of truth stays the markup, and the store is only a view of it.
`setEnvs` preserves the other fields of `window.h11x` — the object is shared, and the space next to `envs` will be needed again.

**Public variables travel at runtime instead of being baked into the bundle.** `import.meta.env` and `VITE_*` work, but the values land in the bundle at build time.
Why that is unacceptable: an image is built once and run with different environments — whatever was in CI would be inside it.
Cost: ssg pages are rendered at build time, so `PUBLIC_*` freeze into their html. Unavoidable.

## h11-x — localization and aliases

**Externality in the server build takes the application's aliases into account.** It was: anything not starting with a dot or a slash counted as external. It is now: plus the alias names from `viteBase`.
Why: this was a bug, and not about locales. Measured — with `resolve.alias: {'@locale': ...}` the built route module still held `import { title } from "@locale"`, the build passed silently, and production would crash on startup. The same `{'@': './src'}` — the most common alias in the world — broke in exactly the same way.
Our rule steps aside if the application set `build.rollupOptions.external` itself. The application's value is not repeated in our layer: defu concatenates arrays, and an external named twice would be duplicated — caught by a test.
Regular expressions in `find` are skipped: they cannot be compared with an id before resolution, and there is no resolution at that step.
Aliases from the project's `vite.config.ts` are not taken into account this way — vite reads that file itself, and we do not see it before the build. Documented: aliases are set through `viteBase`.

**`Template` spreads its props onto `<html>`.**
Why: localization needs `lang` and `dir` — without the first the browser does not know the language for hyphenation and screen readers, without the second rtl cannot be turned on. A separate channel for two attributes is not needed.
Measured that children do not arrive in props (they come via ctx), so spreading the props whole is safe.

**Locale strings are baked into the page at build time, per key.** The locale is picked with an alias, the strings are taken with named or namespace imports.
Measured: of three keys the used one remains in the bundle; with two routes sharing a catalog, a page's bundle receives only its own keys and the touched keys of the shared file — no other page, nothing unused, no other language. The same in the route's server module.
Rejected: `define` with the whole catalog — measured, the object is not cut and is substituted anew at every access site. `define` with pinpoint keys does work, but a missed key stays in the code as `__T.foo` and fails at runtime, whereas with imports it is a compile error.
Cost: the keys are flat (named exports only exist at the top level) and the language is fixed at build time — one image per language. Several languages in one deployment would need a client build per locale, a per-locale output in `config.json` and a script tag choice in ssr; none of that exists.

**The locale catalog is ts files, not json.** Strings as exports, plurals as ordinary functions on top of `Intl.PluralRules`.
Why ts: you cannot put functions into json, and they are needed for plurals, interpolations and dates. The cutting works the same — measured, vite turns json into a module with named exports, but that is where its abilities end.
Why `Intl.PluralRules`: the forms are worked out by the browser from the language's rules (in Russian `one`, `few`, `many`), no tables of our own needed. The rules are created once per locale file — the file knows its language, and building them on every call is expensive.
Rejected: factories like `createPlural('ru', {...})` at module level. Measured: the bundler cannot prove such a call is harmless, so it keeps both the call and the strings — an unused key travels into the bundle and runs on load as well. `/*#__PURE__*/` cures that, also measured, but leaning on a comment that is easy to forget is worse than the rule "ordinary functions".

**The catalog is flat exports, not an object.** The nesting comes from a namespace import at the call site.
Why: measured, the bundler cuts by exports and not by properties. One object for the whole catalog travels into the bundle whole, together with other pages (`{signin:{...},about:{...}}.signin.title` in the built code), an object per namespace travels whole with its own unused keys, and a flat export travels key by key.

**Locale agreement is checked by types, not by a test.** Five lines in `check.ts`: `Widen<typeof import(...)>` in both directions.
Why `Widen`: literal string types of different languages are incompatible by definition (`"Submit"` versus `"Отправить"`), so the literals are widened to `string` while function signatures stay — those are what must match. Measured: it catches a forgotten key, an extra key and a drifted signature, `(count: string)` versus `(count: number)`; different translations of the same key are not an error.
Rejected: a test on `Object.keys` — it would compare the keys but not the function signatures.

## h11-x — the HMR channel

**Vite is given a ws server of its own: an empty `node:http` on `127.0.0.1` with a random port.**
Why: in middleware mode vite otherwise starts its own server on 24678 and bakes that port into the client. The browser goes past the application's origin, and behind a reverse proxy with https the channel does not come up at all — the port is not exposed, and the browser blocks `ws://` from a page served over `https`. With a server passed in, the baked-in port becomes `null`, and the client connects back to wherever it got the page from: the same host, port and protocol.
Cost: an extra listening socket on the loopback. It is not exposed.
Rejected: `ws: {clientPort, protocol}` in the application's config (the application does not know the public port behind a proxy — behind Caddy that is 443, while Bun listens on another one) and a separate route in the proxy itself (configuration on the deployment side, which we do not control).

**Frames between the browser and vite are shuffled by a proxy over two sockets.** Upgrading "to another address" is impossible in principle, so there are exactly two connections, glued by the handler's closure.
Why: the handshake over vite's protocol is done by vite itself on its own host — we need to implement neither it nor the message format. As a bonus vite sees a local client from `127.0.0.1` and asks for neither `allowedHosts` nor a token by `Origin`.
Rejected: our own `HotChannel` through vite's transport API — we would have to reproduce the client's protocol by hand and hold on to private details.

**The proxy is registered before the connect adapter.** An upgrade is an ordinary GET, and vite's http middlewares would have answered it first.

**When the far half breaks, the client half is torn down with `terminate`, not `close`.** A polite close waits for a reply frame, and there is nobody to reply. Vite's client reconnects on a break, so there is nothing to lose.
A known Bun quirk: a connection whose far half broke abnormally sometimes stays in `pendingWebSockets`, and `server.stop(true)` then never waits it out. In live dev this does not reproduce (the channel holds both while idle and under edits), it is only caught under load in the tests — which is why the test's wait for the stop is bounded by time.

**`createApp` returns `close()`.** Dev holds two listening sockets and they have to be shut down together; in production it is a no-op.

## h11-x — serving and pages

**The root `/**` is gone.** Ssg pages are registered by name from `pages`; the wildcard remains only on `${prefix}/**`.
Why: the catch-all opened the whole build directory from the site root, sent every junk url into the file system and occupied the one root slot the application might need.

**A route must have a `.client` and one of `.ssr`/`.ssg`.** Any other combination is a build error.
Why: a route with only a `.client` silently fell out of the build and out of the config.

**An ssg module exports `pages` with ready markup:** `[{pathname, html}]`. Both `html` and the list itself may be promises — there is an `await` in both places.
Rejected: `getPages()` and the pair `pages` + `getHtml` — there is no point gluing the list of pages and the rendering of one page into a call.
Cost: rendering all the pages starts when the module is imported, not one by one.

**The hydration data JSON is escaped** (`<` and `&` → `&lt;`, `&amp;`).
Why: the string `</template>` in props closed the template, and everything after it was parsed by the browser as markup — that is XSS.

**`createPage` renders the component with props, and `hydratePage` takes them from that same `data.props`.**
Why: props only travelled in `data`, the component on the server did not see them, and the types promised something that was not there.

**`Template` and `DataSet` do not take data through props** — they take it from the render context.

**`Head` and `Body` are recognized by `Template` by the component itself.** Marking the children array did not work: in regan children arrive as unexpanded nodes.
Fragments are transparent to the search, recursively: a `<>` wrapper gets added for all sorts of reasons, and a `Head` inside a fragment is the same `Head`. It used to go unfound, and its content silently drifted into `<body>` — a `title` there is still tolerated by the browser, a `viewport` is not.
A lost `Head` or `Body` throws. `Template` takes their content without executing the components themselves, so a `Head` that made it into the render is always a `Head` in the wrong place.
`Template`'s type is simply `FC`, with no description of `children`: in regan children arrive from `ctx` and not from props, and declaring `children?: Child` only got in the way of the types on the application's side.

**An asset's name in `getAssets` is its path relative to the route folder** (`logo.svg`, `icons/logo.svg`), not the basename: two files with the same name from different folders were indistinguishable.

**There are no absolute paths in `config.json`:** `src` is counted from `root`, `server.out` and the contents of `client.out` — from `baseDir`.
Why: with absolute paths a build directory cannot be moved — neither to another directory on the same machine nor to the live one.
Consequence: `App` carries `root` and `baseDir` with it, the vite dev server gets the project's `root`, and dev urls became relative (`/_vite/h11x/src/routes/about/about.client.tsx` instead of a full path from the disk).

**`createApp` builds the project in dev only.** In production it reads the finished `config.json`, and the build is a separate `buildH11X` step.
Why: a production start called vite and demanded the sources with node_modules next to them, which is why "build once and deploy" did not work.
Rejected: a separate `build` flag — the mode is already set through `prod`, and a second lever about the same thing is not needed.

**In dev the root styles are attached as a link with `?direct`, not as a module.**
Why: a module inserts the css from js after the markup is already there — the page flashes unstyled. A link gives the styles right away, and hot replacement is not lost: verified on a live dev server — on a file change vite sends a `css-update` for the `?direct` path, and its client swaps the `<link>` for a new one and removes the old.
Rejected: keeping both tags (a link for the first paint, a module for HMR) — that is a second load of the same file and a second copy of the styles in the DOM, with nothing gained.

**Route styles in dev are enumerated by walking vite's module graph.** Before rendering, a `transformRequest` on the client entry, then recursion over `importedModules` — all the css goes into the markup as links with `?direct`, after the root ones.
This lives in `dev-styles.ts`, with one thing exposed: `getDevStylesTags({vite, prefix, entry, rootStyles})`, returning ready tags as a string. `ssr.tsx` knows nothing about the module graph, `?direct` or the order of the links.
Why: otherwise the route's css arrived as an import inside a script, meaning after the first paint, and the page flashed. The css of a shared component (`about.tsx` rather than `about.client.tsx`) is only visible this way.
Cost: in dev the same css arrives twice — as a link and as a `style` tag from the import. The content is identical and it will not be visible; the duplicate cannot be removed without breaking the import in the module. The route's first render costs the walk time extra (44 ms on `h11-x-example`), after that 0.3 ms — the modules are already transformed.
Css is looked up by extension and not by `node.type`: a node gets the type `'css'` only for a request with `?direct`, while a file imported from js sits in the graph as an ordinary js module.
Rejected: our own cache of the list with a reset on HMR — the cache is already there as `transformResult` in the node itself, and hot replacement clears it. A second cache would have to be invalidated by hand, and it would drift out of sync with the graph.

**The project's root styles are `src/styles.css` by convention.** They are built into a separate file and attached to every page as the first `<link>`, before the route's styles.
Why: there was nowhere to put shared variables, fonts and a reset — they had to be imported into every client file.
Rejected: baking them into every route's bundle — one file would be cached anew on every page.

**`root` and `baseDir` are different parameters:** the project root and the build directory.
Why: `.env` was looked up inside `.h11x`, which the build wipes on every start, meaning it was never read.
