import { describe, it, expect, mock } from 'bun:test';
import { H11 } from './core.ts';
import type { RequestEvent, ResponseEvent } from '../types.ts';

const makeReq = (url: string, method = 'GET') =>
  new Request(`http://localhost${url}`, { method });

// Апгрейд умеет только провайдер, а тут его нет — сокеты этим тестам
// не нужны.
const ctx = () => ({ data: {}, providers: {}, upgrade: () => undefined });

describe('H11', () => {
  describe('routing', () => {
    it('вызывает GET-обработчик по пути', async () => {
      const app = new H11();
      app.get('/hello', () => new Response('ok'));

      const res = await app.exec({ req: makeReq('/hello'), ...ctx() });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    });

    it('разделяет методы — GET и POST на одном пути', async () => {
      const app = new H11();
      app.get('/a', () => new Response('get'));
      app.post('/a', () => new Response('post'));

      const get = await app.exec({ req: makeReq('/a', 'GET'), ...ctx() });
      const post = await app.exec({ req: makeReq('/a', 'POST'), ...ctx() });

      expect(await get.text()).toBe('get');
      expect(await post.text()).toBe('post');
    });

    it('поддерживает все HTTP-методы', async () => {
      const app = new H11();
      app
        .put('/r', () => new Response('put'))
        .delete('/r', () => new Response('delete'))
        .patch('/r', () => new Response('patch'))
        .head('/r', () => new Response('head'))
        .options('/r', () => new Response('options'));

      for (const [method, expected] of [
        ['PUT', 'put'],
        ['DELETE', 'delete'],
        ['PATCH', 'patch'],
        ['HEAD', 'head'],
        ['OPTIONS', 'options'],
      ] as const) {
        const res = await app.exec({ req: makeReq('/r', method), ...ctx() });
        expect(await res.text()).toBe(expected);
      }
    });

    it('извлекает параметры пути', async () => {
      const app = new H11();
      app.get('/users/:id', ({ params }) => new Response(params.id));

      const res = await app.exec({ req: makeReq('/users/42'), ...ctx() });
      expect(await res.text()).toBe('42');
    });

    it('извлекает несколько параметров', async () => {
      const app = new H11();
      app.get(
        '/a/:x/b/:y',
        ({ params }) => new Response(`${params.x}-${params.y}`),
      );

      const res = await app.exec({ req: makeReq('/a/foo/b/bar'), ...ctx() });
      expect(await res.text()).toBe('foo-bar');
    });

    it('поддерживает wildcard-роут', async () => {
      const app = new H11();
      app.get('/files/**', ({ params }) => new Response(params.wild));

      const res = await app.exec({ req: makeReq('/files/a/b/c'), ...ctx() });
      expect(await res.text()).toBe('a/b/c');
    });
  });

  describe('middleware / цепочка обработчиков', () => {
    it('выполняет middleware перед обработчиком', async () => {
      const app = new H11();
      const order: string[] = [];

      app.use('/api', () => {
        order.push('mw');
      });
      app.get('/api/users', () => {
        order.push('handler');
        return new Response('users');
      });

      await app.exec({ req: makeReq('/api/users'), ...ctx() });
      expect(order).toEqual(['mw', 'handler']);
    });

    it('use без паттерна применяется глобально', async () => {
      const app = new H11();
      const calls: string[] = [];

      app.use(() => {
        calls.push('global');
      });
      app.get('/x', () => new Response('x'));

      await app.exec({ req: makeReq('/x'), ...ctx() });
      expect(calls).toContain('global');
    });

    it('первый обработчик, вернувший Response, останавливает цепочку', async () => {
      const app = new H11();
      const second = mock(() => new Response('second'));

      app.get('/stop', () => new Response('first'), second);

      const res = await app.exec({ req: makeReq('/stop'), ...ctx() });
      expect(await res.text()).toBe('first');
      expect(second).not.toHaveBeenCalled();
    });

    it('data передаётся между обработчиками', async () => {
      const app = new H11();

      app.get(
        '/d',
        ({ data }) => {
          (data as any).value = 'hello';
        },
        ({ data }) => new Response((data as any).value),
      );

      const res = await app.exec({ req: makeReq('/d'), ...ctx() });
      expect(await res.text()).toBe('hello');
    });
  });

  describe('onNotFound', () => {
    it('возвращает 404 для неизвестного пути', async () => {
      const app = new H11();
      const res = await app.exec({ req: makeReq('/nope'), ...ctx() });
      expect(res.status).toBe(404);
    });

    it('вызывает кастомный onNotFound', async () => {
      const app = new H11();
      app.onNotFound = () => new Response('custom 404', { status: 404 });

      const res = await app.exec({ req: makeReq('/missing'), ...ctx() });
      expect(await res.text()).toBe('custom 404');
    });
  });

  describe('onError', () => {
    it('возвращает 500 при выброшенной ошибке', async () => {
      const app = new H11();
      app.get('/boom', () => {
        throw new Error('oops');
      });

      const res = await app.exec({ req: makeReq('/boom'), ...ctx() });
      expect(res.status).toBe(500);
    });

    it('вызывает кастомный onError с объектом ошибки', async () => {
      const app = new H11();
      app.onError = ({ error }) => new Response(error.message, { status: 500 });
      app.get('/err', () => {
        throw new Error('test error');
      });

      const res = await app.exec({ req: makeReq('/err'), ...ctx() });
      expect(await res.text()).toBe('test error');
    });

    it('если брошен Response — возвращает его напрямую', async () => {
      const app = new H11();
      app.get('/throw-res', () => {
        throw new Response('thrown', { status: 418 });
      });

      const res = await app.exec({ req: makeReq('/throw-res'), ...ctx() });
      expect(res.status).toBe(418);
      expect(await res.text()).toBe('thrown');
    });
  });
});

describe('перебор вариантов', () => {
  const exec = (h11: H11, path: string, method = 'GET') =>
    h11.exec({
      req: new Request(`http://x${path}`, { method }),
      ...ctx(),
    });

  it('статика выигрывает у параметра', async () => {
    const h11 = new H11();
    h11.get('/users/new', () => new Response('static'));
    h11.get('/users/:id', ({ params }) => new Response(`param ${params.id}`));

    expect(await (await exec(h11, '/users/new')).text()).toBe('static');
  });

  it('статика промолчала — ход переходит параметру', async () => {
    const h11 = new H11();
    h11.get('/users/new', () => undefined);
    h11.get('/users/:id', ({ params }) => new Response(`param ${params.id}`));

    expect(await (await exec(h11, '/users/new')).text()).toBe('param new');
  });

  it('точный путь есть только под другим методом — работает параметр', async () => {
    const h11 = new H11();
    h11.post('/users/new', () => new Response('post'));
    h11.get('/users/:id', ({ params }) => new Response(`param ${params.id}`));

    expect(await (await exec(h11, '/users/new')).text()).toBe('param new');
  });

  it('параметр промолчал — ход переходит wildcard', async () => {
    const h11 = new H11();
    h11.get('/users/:id', () => undefined);
    h11.get('/users/**', ({ params }) => new Response(`wild ${params.wild}`));

    expect(await (await exec(h11, '/users/42')).text()).toBe('wild 42');
  });

  it('никто не ответил — onNotFound', async () => {
    const h11 = new H11();
    h11.get('/users/:id', () => undefined);

    expect((await exec(h11, '/users/42')).status).toBe(404);
  });

  it('миддлварь выполняется один раз на все варианты', async () => {
    const h11 = new H11();
    let calls = 0;

    h11.use('/users', () => {
      calls++;
      return undefined;
    });
    h11.get('/users/new', () => undefined);
    h11.get('/users/:id', () => new Response('param'));

    await exec(h11, '/users/new');
    expect(calls).toBe(1);
  });
});

describe('события request и response', () => {
  it('кидается на каждый запрос, со статусом настоящего ответа', async () => {
    const h11 = new H11();
    const events: ResponseEvent[] = [];
    h11.ee.on('response', (event) => events.push(event));

    h11.get('/hello', () => new Response('ok'));

    await h11.exec({ req: makeReq('/hello'), ...ctx() });
    await h11.exec({ req: makeReq('/nope'), ...ctx() });

    expect(events).toHaveLength(2);
    expect(events[0].res.status).toBe(200);
    expect(events[0].req.method).toBe('GET');
    expect(events[0].ms).toBeGreaterThanOrEqual(0);
    expect(events[0].error).toBeUndefined();
    expect(events[1].res.status).toBe(404);
  });

  it('переживает свои onError и onNotFound — его кидает ядро', async () => {
    const h11 = new H11();
    const events: ResponseEvent[] = [];
    h11.ee.on('response', (event) => events.push(event));

    h11.onNotFound = () => new Response('нет', { status: 410 });
    h11.onError = () => new Response('ой', { status: 503 });

    h11.get('/boom', () => {
      throw new Error('внутри всё сломалось');
    });

    await h11.exec({ req: makeReq('/boom'), ...ctx() });
    await h11.exec({ req: makeReq('/nope'), ...ctx() });

    expect(events).toHaveLength(2);
    expect(events[0].res.status).toBe(503);
    expect(events[0].error?.message).toBe('внутри всё сломалось');
    expect(events[1].res.status).toBe(410);
    expect(events[1].error).toBeUndefined();
  });

  it('брошенный Response едет обычным ответом, без error', async () => {
    const h11 = new H11();
    const events: ResponseEvent[] = [];
    h11.ee.on('response', (event) => events.push(event));

    h11.get('/early', () => {
      throw new Response('редирект', { status: 302 });
    });

    await h11.exec({ req: makeReq('/early'), ...ctx() });

    expect(events[0].res.status).toBe(302);
    expect(events[0].error).toBeUndefined();
  });

  it('reqId в событии тот же, что в контексте', async () => {
    const h11 = new H11();
    const events: ResponseEvent[] = [];
    h11.ee.on('response', (event) => events.push(event));

    let fromCtx = '';
    h11.get('/hello', ({ reqId }) => {
      fromCtx = reqId;
      return new Response('ok');
    });

    await h11.exec({ req: makeReq('/hello'), ...ctx() });

    expect(events[0].reqId).toBe(fromCtx);
  });
  it('request кидается до обработки, response после — и видно оба', async () => {
    const h11 = new H11();
    const order: string[] = [];

    h11.ee.on('request', (event: RequestEvent) => {
      order.push(`request ${event.reqId}`);
    });
    h11.ee.on('response', (event: ResponseEvent) => {
      order.push(`response ${event.reqId} ${event.res.status}`);
    });

    h11.get('/hello', ({ reqId }) => {
      order.push(`handler ${reqId}`);
      return new Response('ok');
    });

    await h11.exec({ req: makeReq('/hello'), ...ctx() });

    const [first, second, third] = order;
    const reqId = first.split(' ')[1];

    expect(first).toBe(`request ${reqId}`);
    expect(second).toBe(`handler ${reqId}`);
    expect(third).toBe(`response ${reqId} 200`);
  });

  it('request приезжает и у запроса, который завис', async () => {
    const h11 = new H11();
    const requests: RequestEvent[] = [];
    const responses: ResponseEvent[] = [];

    h11.ee.on('request', (event) => requests.push(event));
    h11.ee.on('response', (event) => responses.push(event));

    h11.get('/hang', () => new Promise<Response>(() => {}));

    const hanging = h11.exec({ req: makeReq('/hang'), ...ctx() });

    await Promise.race([hanging, Bun.sleep(10)]);

    expect(requests).toHaveLength(1);
    expect(responses).toHaveLength(0);
  });

  it('providers едут в оба события — из них достают ip', async () => {
    const h11 = new H11();
    const providers = { bun: { server: 'сервер' } };
    let fromRequest: Record<string, any> = {};
    let fromResponse: Record<string, any> = {};

    h11.ee.on('request', (event) => {
      fromRequest = event.providers;
    });
    h11.ee.on('response', (event) => {
      fromResponse = event.providers;
    });

    h11.get('/hello', () => new Response('ok'));

    await h11.exec({ req: makeReq('/hello'), ...ctx(), providers });

    expect(fromRequest).toBe(providers);
    expect(fromResponse).toBe(providers);
  });
});
