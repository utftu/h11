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
      ...createServer({ h11 }),
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

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

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

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

    expect((await fetch(`http://localhost:${server.port}/boom`)).status).toBe(
      500,
    );
    expect(
      await (await fetch(`http://localhost:${server.port}/ok`)).text(),
    ).toBe('жив');

    await server.stop(true);
  });
});

// Соединение живёт дольше запроса, поэтому тесты ждут событий, а не ответа.
const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 100; i++) {
    if (check()) {
      return true;
    }
    await Bun.sleep(20);
  }

  return false;
};

describe('вебсокеты', () => {
  it('апгрейдит соединение и возит сообщения в обе стороны', async () => {
    const h11 = new H11();

    h11.get('/room/:id', ({ params, upgrade }) => {
      // Состояние соединения — в замыкании хендлера, поэтому params видны
      // всем коллбекам без отдельного хранилища.
      return upgrade({
        open: (ws) => ws.send(`комната ${params.id}`),
        message: (ws, message) => ws.send(`эхо: ${message}`),
      });
    });

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });
    const got: string[] = [];

    const ws = new WebSocket(`ws://localhost:${server.port}/room/kitchen`);
    ws.onmessage = (event) => got.push(String(event.data));

    expect(await waitFor(() => got.length === 1)).toBe(true);
    expect(got[0]).toBe('комната kitchen');

    ws.send('привет');
    expect(await waitFor(() => got.length === 2)).toBe(true);
    expect(got[1]).toBe('эхо: привет');

    ws.close();
    await server.stop(true);
  });

  it('закрытие доезжает до хендлера', async () => {
    const h11 = new H11();
    let closed: { code: number; reason: string } | undefined;

    h11.get('/socket', ({ upgrade }) =>
      upgrade({ close: (_, code, reason) => (closed = { code, reason }) }),
    );

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

    const ws = new WebSocket(`ws://localhost:${server.port}/socket`);
    await waitFor(() => ws.readyState === WebSocket.OPEN);
    ws.close(4000, 'пока');

    expect(await waitFor(() => closed !== undefined)).toBe(true);
    expect(closed).toEqual({ code: 4000, reason: 'пока' });

    await server.stop(true);
  });

  it('обычный запрос на тот же путь апгрейд не проходит и падает дальше', async () => {
    const h11 = new H11();

    // upgrade вернул undefined — хендлер считается отказавшимся, и ход идёт
    // следующему варианту, как у любого другого хендлера.
    h11.get('/socket', ({ upgrade }) => upgrade({}));
    h11.get('/**', () => new Response('это не сокет'));

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

    const res = await fetch(`http://localhost:${server.port}/socket`);
    expect(await res.text()).toBe('это не сокет');

    await server.stop(true);
  });

  it('до апгрейда отрабатывают миддлвари и могут его не пустить', async () => {
    const h11 = new H11();

    h11.use('/private/**', ({ req }) => {
      if (req.headers.get('x-token') === null) {
        return new Response('нельзя', { status: 401 });
      }
    });
    h11.get('/private/socket', ({ upgrade }) =>
      upgrade({ open: (ws) => ws.send('пустили') }),
    );

    const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

    const res = await fetch(`http://localhost:${server.port}/private/socket`);
    expect(res.status).toBe(401);

    await server.stop(true);
  });
});
