import { H11 } from 'h11';
import {
  handleConnectMiddleware,
  recComporess,
  serveFilesModule,
} from 'h11-fs';
import { buildH11X, getSsrHtml, makeSsg, makeSsr, readSsrConfig } from 'h11-x';
import { createBunProvider } from 'h11-bun';
import { getAbsolutePath } from 'utftu';
import { createServer as createViteServer } from 'vite';
import { reganVite } from 'regan-vite';

// await makeSsg({
//   routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
//   prod: true,
// });
// await makeSsr({
//   routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
// });
// await recComporess(getAbsolutePath('../.h11x/assets', import.meta));

const vite = await createViteServer({
  plugins: [reganVite()],
  base: '/_vite',
  server: {
    middlewareMode: true,
    // hmr: {
    //   // server,
    // },
  },
});

await buildH11X({
  baseDir: getAbsolutePath('../.h11x', import.meta),
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
  });
  const html = getHtml();
  return new Response(getHtml(), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

h11.get(
  '/_vite/**',
  handleConnectMiddleware({
    prefixToRemove: '/_vite/',
    connectMiddleware: vite.middlewares,
  })
);

const bunProvider = createBunProvider({ h11 });

Bun.serve({
  // unix: '\0benchmark-h11-bun',
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});
