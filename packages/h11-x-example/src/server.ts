import { H11 } from 'h11';
import {
  handleConnectMiddleware,
  recComporess,
  serveFilesModule,
} from 'h11-fs';
import { buildH11X, makeSsg, makeSsr } from 'h11-x';
import { createBunProvider } from 'h11-bun';
import { getAbsolutePath } from 'utftu';

// await makeSsg({
//   routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
//   prod: true,
// });
// await makeSsr({
//   routes: [{ type: 'ssr', dir: './src/routes/about', pathname: 'about.ssr' }],
// });
// await recComporess(getAbsolutePath('../.h11x/assets', import.meta));

await buildH11X({
  baseDir: getAbsolutePath('../.h11x', import.meta),
  prod: true,
  routes: [getAbsolutePath('./routes/about', import.meta)],
});

const h11 = new H11();
h11.startLogger();

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
