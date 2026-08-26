import { getContentTypeConfig } from 'h11';
import { createBunProvider } from 'h11/bun';
import { getAbsolutePath } from 'utftu';
import { createH11XApp, getSsrHtml } from 'h11-x';

const app = await createH11XApp({
  baseDir: getAbsolutePath('../.h11x', import.meta),
  routes: [getAbsolutePath('./routes/about', import.meta)],
  prod: false,
});

app.h11.get('/about', async () => {
  const getHtml = await getSsrHtml({
    app,
    name: 'about',
    props: {},
  });
  const html = getHtml();
  return new Response(html, getContentTypeConfig('html'));
});

const bunProvider = createBunProvider({ h11: app.h11 });

Bun.serve({
  port: 3000,
  async fetch(req, server) {
    return bunProvider(req, server);
  },
});
