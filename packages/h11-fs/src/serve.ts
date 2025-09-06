import { joinUserPath, type Handler } from 'h11';
import { fsApi } from './fs.ts';

export const serveFilesModule = (dirToServe: string, prefix: string = '') => {
  const handler: Handler = async ({ req }) => {
    const url = new URL(req.url);

    const resultPathname = url.pathname.slice(prefix.length);
    const filePath = joinUserPath(dirToServe, resultPathname);

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

    return new Response(stream as any as ReadableStream, {
      status: 200,
    });
  };

  return handler;
};
