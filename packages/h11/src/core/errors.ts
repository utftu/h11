import type { Context } from '../types.ts';

export type NotFoundHandler = (props: Context) => Response | Promise<Response>;
export type ErrorHandler = (
  props: { error: Error } & Context,
) => Response | Promise<Response>;

// Дефолтные хендлеры только отвечают, ничего не эмитят: про каждый запрос,
// включая 404 и 500, ядро кидает событие response — и кидает независимо от
// того, свои тут хендлеры или эти.
export const defaultOnNotFound: NotFoundHandler = () => {
  return new Response('Not Found', {
    status: 404,
    statusText: 'Not Found 404',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export const defaultOnError: ErrorHandler = () => {
  return new Response('Internal Server Error', {
    status: 500,
    statusText: 'Internal Server Error',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
