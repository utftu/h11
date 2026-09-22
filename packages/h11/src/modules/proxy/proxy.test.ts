import { describe, expect, it } from 'bun:test';
import { proxyReq } from './proxy.ts';
import { H11 } from '../../core/core.ts';
import { createServer } from '../../server/server.ts';

// Настоящий сервер на том конце: proxyReq ходит через fetch, поэтому
// подменять там нечего.
const startTarget = () => {
  const target = new H11();

  target.get('/hello', ({ req }) => {
    const url = new URL(req.url);
    return new Response(`цель: ${url.search}`, {
      headers: { 'x-from': 'target' },
    });
  });

  target.post('/echo', async ({ req }) => new Response(await req.text()));
  target.get('/gone', () => new Response('нет', { status: 404 }));

  return Bun.serve({ port: 0, ...createServer({ h11: target }) });
};

describe('proxyReq', () => {
  it('переносит путь, query, статус и заголовки ответа', async () => {
    const target = startTarget();
    const h11 = new H11();
    h11.get('/**', proxyReq(`http://localhost:${target.port}`));

    const front = Bun.serve({ port: 0, ...createServer({ h11 }) });
    const res = await fetch(`http://localhost:${front.port}/hello?a=1`);

    expect(await res.text()).toBe('цель: ?a=1');
    expect(res.headers.get('x-from')).toBe('target');

    await front.stop(true);
    await target.stop(true);
  });

  it('прокидывает метод и тело', async () => {
    const target = startTarget();
    const h11 = new H11();
    h11.post('/**', proxyReq(`http://localhost:${target.port}`));

    const front = Bun.serve({ port: 0, ...createServer({ h11 }) });
    const res = await fetch(`http://localhost:${front.port}/echo`, {
      method: 'POST',
      body: 'тело запроса',
    });

    expect(await res.text()).toBe('тело запроса');

    await front.stop(true);
    await target.stop(true);
  });

  it('статус цели отдаётся как есть', async () => {
    const target = startTarget();
    const h11 = new H11();
    h11.get('/**', proxyReq(`http://localhost:${target.port}`));

    const front = Bun.serve({ port: 0, ...createServer({ h11 }) });
    const res = await fetch(`http://localhost:${front.port}/gone`);

    expect(res.status).toBe(404);

    await front.stop(true);
    await target.stop(true);
  });
});
