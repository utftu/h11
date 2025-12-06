### Create vite server

```ts
import { createServer as createViteServer } from 'vite';
import { reganVite } from 'regan-vite';

const vite = await createViteServer({
  plugins: [reganVite()],
  base: defaultFullPrefix,
  server: {
    middlewareMode: true,
  },
});
```

### Build h11-x and read config for ssr

```ts
import { buildH11X, readSsrConfig } from 'h11-x';
import { getAbsolutePath } from 'utftu';

await buildH11X({
  baseDir,
  prod: false,
  routes: [getAbsolutePath('./routes/about', import.meta)],
});
const ssrConfig = await readSsrConfig();
```

### Init h11 server

```ts
import { H11 } from 'h11';

const h11 = new H11();
h11.startLogger();
```

### Connect vite dev server

```ts
if (!ssrConfig.prod) {
  h11.get(
    `${devPrefix}/**`,
    handleConnectMiddleware({
      prefixToRemove: devPrefix,
      connectMiddleware: vite.middlewares,
    })
  );
}
```

### Serve static files

```ts
h11.get(
  `${prefix}/**`,
  serveFiles({ dir: `${baseDir}/assets`, prefix: `${prefix}/` })
);
h11.get('/**', serveFiles({ dir: `${baseDir}/assets`, prefix: '' }));
```

### Init profider and start server

```ts
const bunProvider = createBunProvider({ h11 });

Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});
```
