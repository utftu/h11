import { H11 } from 'h11';
import { handleConnectMiddleware, serveFiles } from 'h11-fs';
import { createBunProvider } from 'h11-bun';
import { getAbsolutePath } from 'utftu';
import { createServer as createViteServer } from 'vite';
import { reganVite } from 'regan-vite';
import { buildH11X, defaultFullPrefix, getSsrHtml, readSsrConfig } from 'h11-x';

const preparedHtmlServe = (route: string) => {};

const vite = await createViteServer({
  plugins: [reganVite()],
  base: '/_vite/h11x',
  server: {
    middlewareMode: true,
  },
});

const baseDir = getAbsolutePath('../.h11x', import.meta);

await buildH11X({
  baseDir,
  prod: true,
  routes: [getAbsolutePath('./routes/about', import.meta)],
});
const ssrConfig = await readSsrConfig();

const h11 = new H11();
h11.startLogger();

h11.get('/about', async () => {
  let html: string;
  try {
    const getHtml = await getSsrHtml({
      vite,
      config: ssrConfig,
      name: 'about',
    });
    html = getHtml();
  } catch (err) {
    console.log('-----', 'err', err);
    throw err;
  }
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

// h11.get('/h11x/**', serveFilesModule(`${baseDir}/assets`, '/h11x'));

h11.get(
  `${defaultFullPrefix}/**`,
  handleConnectMiddleware({
    prefixToRemove: defaultFullPrefix,
    connectMiddleware: vite.middlewares,
  })
);

h11.get('/h11x/**', serveFiles({ dir: `${baseDir}/assets`, prefix: '/h11x/' }));
h11.get('/**', serveFiles({ dir: `${baseDir}/assets`, prefix: '' }));

const bunProvider = createBunProvider({ h11 });

Bun.serve({
  // unix: '\0benchmark-h11-bun',
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});
