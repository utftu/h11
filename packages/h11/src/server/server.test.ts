import { describe, expect, it } from 'bun:test';
import { createServer } from './server.ts';
import { H11 } from '../core/core.ts';

describe('createServer', () => {
  it('отдаёт ответ приложения на живом Bun.serve', async () => {
    const h11 = new H11();
    h11.get(
      '/hello/:name',
      ({ params }) => new Response(`привет, ${params.name}`),
    );

    const server = Bun.serve({
      port: 0,
      fetch: createServer({ h11 }),
    });

    const res = await fetch(`http://localhost:${server.port}/hello/aleksey`);
    expect(await res.text()).toBe('привет, aleksey');

    await server.stop(true);
  });

  it('кладёт req и server приложения в providers.bun', async () => {
    const h11 = new H11();
    let seen: { req?: Request; server?: unknown } = {};

    h11.get('/probe', ({ providers }) => {
      seen = providers.bun;
      return new Response('ok');
    });

    const server = Bun.serve({ port: 0, fetch: createServer({ h11 }) });

    await fetch(`http://localhost:${server.port}/probe`);
    expect(seen.req).toBeInstanceOf(Request);
    expect(seen.server).toBe(server);

    await server.stop(true);
  });

  it('ошибка в хендлере превращается в 500, сервер продолжает работать', async () => {
    const h11 = new H11();
    h11.get('/boom', () => {
      throw new Error('упал');
    });
    h11.get('/ok', () => new Response('жив'));

    const server = Bun.serve({ port: 0, fetch: createServer({ h11 }) });

    expect((await fetch(`http://localhost:${server.port}/boom`)).status).toBe(
      500,
    );
    expect(
      await (await fetch(`http://localhost:${server.port}/ok`)).text(),
    ).toBe('жив');

    await server.stop(true);
  });
});
