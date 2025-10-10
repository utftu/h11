import { H11 } from 'h11';
import { handleConnectMiddleware, serveFilesModule } from 'h11-fs';
import { makeSsg, makeSsr } from 'h11-x';
import { createBunProvider } from 'h11-bun';
import { createServer as createViteServer } from 'vite';

await makeSsg({
  routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
  prod: true,
});
await makeSsr({
  routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
});

// const vite = await createViteServer({
//   server: { middlewareMode: true },
//   appType: 'custom',
// });

const h11 = new H11();

h11.get('/**', serveFilesModule('.h11x/assets', '/'));

// h11.get(
//   '/**',
//   handleConnectMiddleware({
//     prefixToRemove: '',
//     connectMiddleware: vite.middlewares,
//   })
// );

const bunProvider = createBunProvider({ h11 });

Bun.serve({
  // unix: '\0benchmark-h11-bun',
  port: 3000,
  async fetch(req, server) {
    const res = await bunProvider(req, server);
    return res;
  },
});
