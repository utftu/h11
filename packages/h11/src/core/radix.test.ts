import { describe, it, expect } from 'bun:test';
import { Radix } from './radix.ts';
import type { Method } from '../types.ts';

const handler = async () => new Response();
const handlerEnt = [handler];

// find отдаёт миддлвари и список вариантов; тесты ниже смотрят на всё, что
// вообще подошло, поэтому склеиваем их в один список.
const find = (radix: Radix, path: string, method: Method = 'GET') => {
  const { middlewares, matches } = radix.find(path, method);

  return {
    handlers: [...middlewares, ...matches.flatMap((match) => match.handlers)],
    params: matches[0]?.params ?? {},
    matches,
  };
};

describe('radix', () => {
  it('add', () => {
    const radix = new Radix();

    radix.add('/hello/:name/world', 'GET', handlerEnt);

    expect(radix.root.staticChildren.size).toBe(1);
    const helloNode = radix.root.staticChildren.get('hello')!;
    expect(helloNode.segment).toBe('hello');
    expect(helloNode.paramChild).toBeDefined();
    const nameNode = helloNode.paramChild!;
    expect(nameNode.segment).toBe(':name');
    expect(nameNode.staticChildren.size).toBe(1);
    const worldNode = nameNode.staticChildren.get('world')!;
    expect(worldNode.segment).toBe('world');
    expect(worldNode.staticChildren.size).toBe(0);
    expect(worldNode.paramChild).toBeUndefined();

    radix.add('/hello/:name/world2', 'GET', handlerEnt);
    expect(nameNode.staticChildren.size).toBe(2);
    expect(nameNode.staticChildren.get('world2')?.segment).toBe('world2');
  });

  it('find', () => {
    const radix = new Radix();

    radix.add('/hello/:name/world', 'GET', handlerEnt);

    const result = find(radix, '/hello/aleksey/world');
    expect(result.handlers).toContain(handler);
    expect(result.params.name).toBe('aleksey');

    radix.add('/hello2/:name/:city', 'GET', handlerEnt);
    const result2 = find(radix, '/hello2/aleksey/london');
    expect(result2.handlers).toContain(handler);
    expect(result2.params.name).toBe('aleksey');
    expect(result2.params.city).toBe('london');

    const result3 = find(radix, '/sdsdsdsdsds');
    expect(result3.handlers.length).toBe(0);
  });

  it('find wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/:name', 'GET', handlerEnt);
    radix.add('/hello/**', 'GET', handlerEnt);

    let result = find(radix, '/hello/world/', 'GET');
    expect(result.handlers).toContain(handler);

    result = find(radix, '/hello/world/aleksey', 'GET');
    expect(result.handlers).toContain(handler);
    expect(result.params.name).toBe('aleksey');

    result = find(radix, '/hello', 'GET');
    expect(result.handlers).toContain(handler);

    const resultEmpty = find(radix, '/hello123', 'GET');
    expect(resultEmpty.handlers.length).toBe(0);
  });

  it('find named and regular', () => {
    const radix = new Radix();

    const specificHandler = async () => new Response();
    radix.add('/hello/world/:name', 'GET', handlerEnt);
    radix.add('/hello/world/aleksey', 'GET', [specificHandler]);

    // Подходят оба, но точный путь идёт первым вариантом, а параметрический
    // остаётся запасным — на случай, если точный не ответит.
    const result = find(radix, '/hello/world/aleksey');
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].handlers).toEqual([specificHandler]);
    expect(result.matches[0].params).toEqual({});
    expect(result.matches[1].handlers).toEqual([handler]);
    expect(result.matches[1].params).toEqual({ name: 'aleksey' });
  });

  it('порядок вариантов: статика, параметр, wild от глубокого к общему', () => {
    const radix = new Radix();

    const staticHandler = async () => new Response();
    const paramHandler = async () => new Response();
    const deepWild = async () => new Response();
    const rootWild = async () => new Response();

    radix.add('/users/new', 'GET', [staticHandler]);
    radix.add('/users/:id', 'GET', [paramHandler]);
    radix.add('/users/**', 'GET', [deepWild]);
    radix.add('/**', 'GET', [rootWild]);

    const { matches } = radix.find('/users/new', 'GET');

    expect(matches.map((match) => match.handlers[0])).toEqual([
      staticHandler,
      paramHandler,
      deepWild,
      rootWild,
    ]);
  });

  it('повторная регистрация дописывает хендлер, а не затирает', () => {
    const radix = new Radix();

    const second = async () => new Response();
    radix.add('/a', 'GET', handlerEnt);
    radix.add('/a', 'GET', [second]);

    expect(radix.find('/a', 'GET').matches[0].handlers).toEqual([
      handler,
      second,
    ]);
  });

  it('find named and wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/**', 'GET', handlerEnt);
    const namedHandler = async () => new Response();
    radix.add('/hello/world/:name', 'GET', [namedHandler]);

    const result = find(radix, '/hello/world/aleksey');
    expect(result.handlers).toContain(namedHandler);
  });

  it('middleware on prefix', () => {
    const radix = new Radix();
    const mw = async () => undefined;

    radix.addMiddleware('/api', [mw]);
    radix.add('/api/users', 'GET', handlerEnt);

    const result = find(radix, '/api/users', 'GET');
    expect(result.handlers[0]).toBe(mw);
    expect(result.handlers[1]).toBe(handler);
  });

  it('wild params', () => {
    const radix = new Radix();
    radix.add('/files/**', 'GET', handlerEnt);

    const result = find(radix, '/files/a/b/c', 'GET');
    expect(result.handlers).toContain(handler);
    expect(result.params.wild).toBe('a/b/c');
  });

  it('несколько вайлдов на разных уровнях цепочатся', () => {
    const radix = new Radix();
    const globalHandler = async () => new Response();
    const apiHandler = async () => new Response();

    radix.add('/**', 'GET', [globalHandler]);
    radix.add('/api/**', 'GET', [apiHandler]);

    const result = find(radix, '/api/users', 'GET');
    expect(result.handlers).toContain(globalHandler);
    expect(result.handlers).toContain(apiHandler);
    // глубокий (более специфичный) вайлд идёт раньше поверхностного
    expect(result.handlers.indexOf(apiHandler)).toBeLessThan(
      result.handlers.indexOf(globalHandler),
    );
    // wild param от самого глубокого совпадения
    expect(result.params.wild).toBe('users');
  });

  it('несколько хендлеров на одном вайлд-узле сохраняют свой порядок', () => {
    const radix = new Radix();
    const globalA = async () => new Response();
    const globalB = async () => new Response();
    const apiA = async () => new Response();
    const apiB = async () => new Response();

    radix.add('/**', 'GET', [globalA, globalB]);
    radix.add('/api/**', 'GET', [apiA, apiB]);

    const result = find(radix, '/api/users', 'GET');
    expect(result.handlers).toEqual([apiA, apiB, globalA, globalB]);
  });

  it('вайлд только на корневом уровне попадает в результат', () => {
    const radix = new Radix();
    const globalHandler = async () => new Response();

    radix.add('/**', 'GET', [globalHandler]);

    const result = find(radix, '/any/path/here', 'GET');
    expect(result.handlers).toContain(globalHandler);
    expect(result.params.wild).toBe('any/path/here');
  });
});

describe('параметры и wildcard вместе', () => {
  it('отдаёт и :param, и wild', () => {
    const radix = new Radix();
    radix.add('/users/:id/**', 'GET', [handler]);

    expect(find(radix, '/users/42/a/b', 'GET').params).toEqual({
      id: '42',
      wild: 'a/b',
    });
  });
});

describe('addMiddleware с "/**"', () => {
  it('вешает миддлварь на тот же узел, что и путь без "/**"', () => {
    const radix = new Radix();
    radix.addMiddleware('/api/**', [handler]);
    radix.add('/api/users', 'GET', [handler]);

    expect(find(radix, '/api/users', 'GET').handlers).toHaveLength(2);
  });
});

describe('конфликт параметров', () => {
  it('падает на втором имени параметра для того же уровня', () => {
    const radix = new Radix();
    radix.add('/a/:x', 'GET', [handler]);

    expect(() => radix.add('/a/:y', 'GET', [handler])).toThrow(
      'Param conflict',
    );
  });
});

describe('проверка паттерна', () => {
  it('путь обязан начинаться со слэша', () => {
    const radix = new Radix();

    expect(() => radix.add('users', 'GET', handlerEnt)).toThrow(
      'must start with "/"',
    );
    expect(() => radix.addMiddleware('api', handlerEnt)).toThrow(
      'must start with "/"',
    );
  });

  it('путь не должен кончаться слэшем', () => {
    const radix = new Radix();

    expect(() => radix.add('/users/', 'GET', handlerEnt)).toThrow(
      'must not end with "/"',
    );
  });

  it('корень — единственное исключение', () => {
    const radix = new Radix();

    expect(() => radix.addMiddleware('/', handlerEnt)).not.toThrow();
    expect(() => radix.add('/', 'GET', handlerEnt)).not.toThrow();
  });
});
