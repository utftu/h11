import type { Context } from '../types.ts';

export type NotFoundHandler = (props: Context) => Response | Promise<Response>;
export type ErrorHandler = (
  props: { error: Error } & Context,
) => Response | Promise<Response>;

export const defaultOnNotFound: NotFoundHandler = ({ req, h11 }) => {
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
};

export const defaultOnError: ErrorHandler = ({ req, error, h11 }) => {
  // В text только сообщение: его подписчик может, не глядя, отправить
  // клиенту. Стек лежит рядом, в самом error — кому он нужен для логов, тот
  // возьмёт его оттуда осознанно.
  h11.ee.emit('code', {
    code: 500,
    text: `h11: Error ${req.url} - ${error.message}`,
    error,
  });

  return new Response('Internal Server Error', {
    status: 500,
    statusText: 'Internal Server Error',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
