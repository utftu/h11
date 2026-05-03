import { describe, it, expect, mock } from 'bun:test';
import { H11 } from './core.ts';

const makeReq = (url: string, method = 'GET') =>
  new Request(`http://localhost${url}`, { method });

const ctx = () => ({ data: {}, providers: {} });

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
      app.get('/a/:x/b/:y', ({ params }) =>
        new Response(`${params.x}-${params.y}`)
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
        ({ data }) => new Response((data as any).value)
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
