import type { Handler } from '../types.ts';
import { getFsApi } from '../fs-api/fs-universal.ts';
import { joinUserPath } from '../utils/join.ts';

export const serveFilesModule = (dirToServe: string, prefix: string = '') => {
  const handler: Handler = async ({ req }) => {
    const url = new URL(req.url);

    const resultPathname = url.pathname.slice(prefix.length);
    const filePath = joinUserPath(dirToServe, resultPathname);

    const fsApi = getFsApi();

    if ((await fsApi.checkExist(filePath)) === false) {
      console.log(`h11: Not found ${req.url}`);
      return new Response('Not Found', {
        status: 404,
        statusText: 'Not Found 404',
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const stream = fsApi.getFileStream(filePath);

    // if ((await exists(filePath)) === false) {
    //   console.log(`h11: Not found ${req.url}`);
    //   return new Response('Not Found', {
    //     status: 404,
    //     statusText: 'Not Found 404',
    //     headers: {
    //       'Content-Type': 'text/plain',
    //     },
    //   });
    // }

    // const nodeStream = createReadStream(filePath);
    // const stream = Readable.toWeb(nodeStream);

    return new Response(stream as any as ReadableStream, {
      status: 200,
    });
  };

  return handler;
};
