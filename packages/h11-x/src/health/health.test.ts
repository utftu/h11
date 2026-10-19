import { describe, it, expect, spyOn } from 'bun:test';
import { H11, createServer } from 'h11';
import { addHealth, pingPath, readyPath } from './health.ts';
import type { HealthChecks } from '../types.ts';

const makeServer = (checks?: HealthChecks) => {
  const h11 = new H11();
  addHealth(h11, { checks });

  const server = Bun.serve({ port: 0, ...createServer({ h11 }) });

  return { server, origin: `http://localhost:${server.port}` };
};

const catchLogs = async (run: () => Promise<void>) => {
  const spy = spyOn(console, 'log').mockImplementation(() => {});
  await run();
  const lines = spy.mock.calls.map((call) => call[0]);
  spy.mockRestore();

  return lines;
};

describe('addHealth', () => {
  it('ping отвечает pong, ready — пустым списком', async () => {
    const { server, origin } = makeServer();

    const ping = await fetch(`${origin}${pingPath}`);
    const ready = await fetch(`${origin}${readyPath}`);

    expect(ping.status).toBe(200);
    expect(await ping.text()).toBe('pong');
    expect(ping.headers.get('content-type')).toBe('text/plain; charset=utf-8');

    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual([]);
    expect(ready.headers.get('content-type')).toBe(
      'application/json;charset=utf-8',
    );

    await server.stop(true);
  });

  it('отвечает и на HEAD — мониторы ходят им', async () => {
    const { server, origin } = makeServer();

    for (const path of [pingPath, readyPath]) {
      const res = await fetch(`${origin}${path}`, { method: 'HEAD' });

      expect(res.status).toBe(200);
      // Тело для HEAD отрезает Bun, заголовки остаются.
      expect(await res.text()).toBe('');
      expect(res.headers.get('content-type')).not.toBeNull();
    }

    await server.stop(true);
  });

  it('все проверки прошли — 200 ok', async () => {
    const { server, origin } = makeServer({
      db: () => 'select 1 ok',
      redis: async () => 'pong',
    });

    const res = await fetch(`${origin}${readyPath}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);

    await server.stop(true);
  });

  it('упавшая проверка даёт 503 с именем, а причина уходит в stdout', async () => {
    const { server, origin } = makeServer({
      db: () => {
        throw new Error('connection refused to postgres://user:pass@host');
      },
      redis: () => 'pong',
    });

    let res: Response | undefined;
    const lines = await catchLogs(async () => {
      res = await fetch(`${origin}${readyPath}`);
    });

    expect(res!.status).toBe(503);
    // В теле только имя: /ready открыт всем, а в тексте ошибки строка
    // подключения.
    expect(await res!.json()).toEqual(['db']);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('ready: db — connection refused');

    await server.stop(true);
  });

  it('синхронный throw ловится так же, как отказ промиса', async () => {
    const { server, origin } = makeServer({
      sync: () => {
        throw new Error('сразу');
      },
      async: async () => {
        throw new Error('потом');
      },
    });

    let res: Response | undefined;
    await catchLogs(async () => {
      res = await fetch(`${origin}${readyPath}`);
    });

    expect(res!.status).toBe(503);
    expect(await res!.json()).toEqual(['sync', 'async']);

    await server.stop(true);
  });

  it('проверка, вернувшая ровно false, считается отказом', async () => {
    const { server, origin } = makeServer({
      pool: () => false,
      zero: () => 0,
      empty: () => '',
    });

    const res = await fetch(`${origin}${readyPath}`);

    // 0 и пустая строка — не отказ: отказ это только false и исключение.
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual(['pool']);

    await server.stop(true);
  });

  it('проверки идут параллельно', async () => {
    const { server, origin } = makeServer({
      first: () => Bun.sleep(60),
      second: () => Bun.sleep(60),
      third: () => Bun.sleep(60),
    });

    const start = performance.now();
    const res = await fetch(`${origin}${readyPath}`);
    const ms = performance.now() - start;

    expect(res.status).toBe(200);
    // Последовательно вышло бы от 180 мс.
    expect(ms).toBeLessThan(150);

    await server.stop(true);
  });

  it('HEAD на упавшую готовность — 503 без тела', async () => {
    const { server, origin } = makeServer({
      db: () => false,
    });

    const res = await fetch(`${origin}${readyPath}`, { method: 'HEAD' });

    expect(res.status).toBe(503);
    expect(await res.text()).toBe('');

    await server.stop(true);
  });
});
