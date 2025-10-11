import { joinUserPath, type Handler } from 'h11';
import { fsApi } from './fs.ts';
import { getFileEnt } from './utils/files.ts';

export const serveFilesModule = (dirToServe: string, prefix: string = '') => {
  const handler: Handler = async ({ req, h11 }) => {
    const url = new URL(req.url);

    const resultPathname = url.pathname.slice(prefix.length);
    const filePath = joinUserPath(dirToServe, resultPathname);

    const fileEnt = await getFileEnt(
      filePath,
      req.headers.get('Accept-Encoding')?.split(', ') || []
    );

    if (!fileEnt) {
      h11.ee.emit('code', {
        code: 404,
        text: `Not found ${req.url}`,
      });

      return new Response('Not Found', {
        status: 404,
        statusText: 'Not Found 404',
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    return new Response(
      fsApi.getFileStream(fileEnt.filepath) as any as ReadableStream,
      {
        status: 200,
        headers: fileEnt.headers,
      }
    );
  };

  return handler;
};
