import { getContentTypeConfig, H11 } from 'h11';
import {serveFiles } from 'h11-fs';
import {createConnectAdapter} from 'h11-fs/node'
import {createBunProvider} from 'h11-fs/bun'
import { getAbsolutePath } from 'utftu';
import { createServer as createViteServer } from 'vite';
import { reganVite } from 'regan-vite';
import { buildH11X, devPrefix, prefix, getSsrHtml, readSsrConfig } from 'h11-x';

const vite = await createViteServer({
  plugins: [reganVite()],
  base: devPrefix,
  server: {
    middlewareMode: true,
  },
});

const baseDir = getAbsolutePath('../.h11x', import.meta);

await buildH11X({
  baseDir,
  prod: false,
  routes: [getAbsolutePath('./routes/about', import.meta)],
});
const ssrConfig = await readSsrConfig();

const h11 = new H11();
h11.startLogger();

h11.get('/about', async () => {
  const getHtml = await getSsrHtml({
    vite,
    config: ssrConfig,
    name: 'about',
    props: {},
  });
  const html = getHtml();
  return new Response(html, getContentTypeConfig('html'));
});

if (!ssrConfig.prod) {
  h11.get(
    `${devPrefix}/**`,
    createConnectAdapter({
      prefixToRemove: devPrefix,
      connectMiddleware: vite.middlewares,
    })
  );
}

h11.get(
  `${prefix}/**`,
  serveFiles({ dir: `${baseDir}/assets`, prefix: `${prefix}/` })
);
h11.get('/**', serveFiles({ dir: `${baseDir}/assets`, prefix: '' }));

const bunProvider = createBunProvider({ h11 });

Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});
