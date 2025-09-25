import { handleConnectMiddleware } from 'h11-fs';
import { H11 } from 'h11';
import { getSsrHtml } from '../src/h11x/ssr.ts';
import { createRateLimiterModule } from '../src/modules/limit.ts';
import { proxyReq } from '../src/modules/proxy.ts';
import { createBunProvider } from '../src/providers/bun.ts';
import serveStatic from 'serve-static';
import { createServer as createViteServer } from 'vite';

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

const h11 = new H11();

h11.get('/hello/world/sasha', () => {
  return new Response(`it is a super path`);
});

h11.get('/hello/world/:name', ({ params }) => {
  return new Response(`hello world mister ${params.name}`);
});

h11.get('/hello/**', ({ params, req }) => {
  req.json();
  return new Response(`it is a wild path ${params.wild}`);
});

// h11.get('/static/**', serveFiles('./hello', '/static/'));
h11.get(
  '/static/express/**',
  handleConnectMiddleware({
    prefixToRemove: '/static/express/',
    connectMiddleware: serveStatic('hello'),
  })
);

h11.get('/google', proxyReq('https://google.com'));

h11.post('/json', createRateLimiterModule(3), async ({ req }) => {
  await req.json();
  return new Response('2000');
});

h11.get('/', async ({ req }) => {
  const file = Bun.file('./index.html');
  const text = await file.text();
  const template = await vite.transformIndexHtml(req.url, text);
  const { render } = await vite.ssrLoadModule('/src/entry-server.js');
  const appHtml = await render();
  const html = template.replace(`<!--ssr-outlet-->`, () => appHtml);
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
});

h11.get('/about', async () => {
  const getHtml = await getSsrHtml({
    isProd: false,
    pathname: 'about',
    pathToFile: './src/routes/about/about.ssr.ts',
    vite,
  });
  let html = getHtml();
  const html2 = await vite.transformIndexHtml('/about', html);
  return new Response(html2, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
});

h11.get(
  '/**',
  handleConnectMiddleware({
    prefixToRemove: '',
    connectMiddleware: vite.middlewares,
  })
);

const bunProvider = createBunProvider({ h11 });

const server = Bun.serve({
  // unix: '\0benchmark-h11-bun',
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});

console.log('bunjs started:', server.port);
