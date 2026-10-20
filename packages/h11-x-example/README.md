# h11-x-example

A working example on [`h11-x`](../h11-x): an SSR route (`/about`) with hydration in the browser, and an ssg route (`/blog`) rendered at build time.

## Running

```bash
cp .env.example .env   # optional — to check that PUBLIC_* variables come through
bun run dev
```

Run it from this very folder: `root` defaults to the working directory, and that is where `.env` and `src/routes` are taken from. From `src/` the example fails with `Cannot find module 'react/jsx-dev-runtime'` — `jsxImportSource: "regan"` does not reach that far.

It opens at `http://localhost:3000/about`, in dev mode (`prod: false`) — with HMR through Vite.

Or through [`dapes`](../../dapes.run.ts) (which builds `h11` → `h11-x` before starting):

```bash
bun run ../../dapes.run.ts example run
```

## Structure

```
src/
  server.ts                     # createApp + registering /about
  styles.css                    # root styles, picked up by convention
  routes/about/
    about.tsx                   # the regan component
    about.ssr.tsx                # createPage(About)
    about.client.tsx              # hydratePage(About), imports about.css
    about.css                     # page styles — in prod they arrive as <link rel="stylesheet">
    logo.svg                      # an asset referenced from css, checks paths inside the built css
  routes/blog/
    blog.tsx                      # the regan component
    blog.ssg.tsx                  # getPages() — the pages, rendered at build time
    blog.client.tsx               # hydratePage(Blog)
```

## `.env`

`.env.example` shows the convention: only variables prefixed with `PUBLIC_` end up in `data.envs` on the client, the rest stay server-only. The `.env` file is in `.gitignore` — do not commit secrets there.
