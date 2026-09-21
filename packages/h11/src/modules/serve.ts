import { joinUserPath } from '../utils/join.ts';
import type { Handler } from '../types.ts';
import { fsApi } from '../fs/api.ts';
import { getFileEnt } from '../utils/files.ts';

// joinUserPath отбрасывает пути, начинающиеся со слэша — это защита от
// абсолютных путей в пользовательском вводе. Здесь слэш остаётся от самого
// url, а не от пользователя, поэтому один ведущий слэш снимаем сами.
export const cutPrefix = (pathname: string, prefix: string) => {
  const rest = pathname.slice(prefix.length);

  if (rest.startsWith('/')) {
    return rest.slice(1);
  }

  return rest;
};

export const serveFiles = ({
  dir,
  prefix = '',
}: {
  dir: string;
  prefix?: string;
}) => {
  const handler: Handler = async ({ req, h11 }) => {
    const url = new URL(req.url);

    const resultPathname = cutPrefix(url.pathname, prefix);
    const filePath = joinUserPath(dir, resultPathname);

    const fileEnt = await getFileEnt(
      filePath,
      req.headers.get('Accept-Encoding')?.split(', ') || [],
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
      },
    );
  };

  return handler;
};
