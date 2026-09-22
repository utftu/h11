import { describe, expect, it } from 'bun:test';
import { createConnectAdapter } from './connect.ts';
import { H11 } from '../core/core.ts';

const exec = (h11: H11, req: Request) =>
  h11.exec({ req, data: {}, providers: {}, upgrade: () => undefined });

describe('createConnectAdapter', () => {
  it('отдаёт ответ, который написала мидлварь', async () => {
    const h11 = new H11();
    h11.use(
      createConnectAdapter({
        connectMiddleware: (_, res) => {
          res.setHeader('content-type', 'text/plain');
          res.end('от мидлвари');
        },
      }),
    );

    const res = await exec(h11, new Request('http://x/any'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');
    expect(await res.text()).toBe('от мидлвари');
  });

  it('вызванный next() пропускает запрос дальше по цепочке', async () => {
    const h11 = new H11();
    h11.use(
      createConnectAdapter({
        connectMiddleware: (_, __, next) => next(undefined),
      }),
    );
    h11.get('/page', () => new Response('роут'));

    expect(await (await exec(h11, new Request('http://x/page'))).text()).toBe(
      'роут',
    );
  });

  it('срезает префикс монтирования из url', async () => {
    const h11 = new H11();
    h11.use(
      '/_dev',
      createConnectAdapter({
        prefixToRemove: '/_dev',
        connectMiddleware: (req, res) => {
          res.end(`url: ${req.url}`);
        },
      }),
    );

    const res = await exec(h11, new Request('http://x/_dev/assets/app.js?v=1'));

    expect(await res.text()).toBe('url: /assets/app.js?v=1');
  });

  it('переносит статус и заголовки из writeHead', async () => {
    const h11 = new H11();
    h11.use(
      createConnectAdapter({
        connectMiddleware: (_, res) => {
          res.writeHead(418, { 'x-teapot': 'yes' });
          res.end('нет кофе');
        },
      }),
    );

    const res = await exec(h11, new Request('http://x/any'));

    expect(res.status).toBe(418);
    expect(res.headers.get('x-teapot')).toBe('yes');
    expect(await res.text()).toBe('нет кофе');
  });

  it('прокидывает тело запроса в мидлварь', async () => {
    const h11 = new H11();
    h11.use(
      createConnectAdapter({
        connectMiddleware: (req, res) => {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => res.end(`тело: ${body}`));
        },
      }),
    );

    const res = await exec(
      h11,
      new Request('http://x/any', { method: 'POST', body: 'привет' }),
    );

    expect(await res.text()).toBe('тело: привет');
  });

  it('ошибка в next(err) всплывает наружу', async () => {
    const h11 = new H11();
    h11.use(
      createConnectAdapter({
        connectMiddleware: (_, __, next) => next(new Error('сломалось')),
      }),
    );

    const res = await exec(h11, new Request('http://x/any'));

    expect(res.status).toBe(500);
  });
});
