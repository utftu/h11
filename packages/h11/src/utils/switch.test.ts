import { describe, it, expect, mock } from 'bun:test';
import { switchFunc } from './switch.ts';

const req = new Request('http://localhost/');

describe('switchFunc', () => {
  it('возвращает handler первого подходящего условия', async () => {
    const handler = mock(() => new Response('matched'));
    const result = await switchFunc(
      [{ check: () => true, handler: () => handler }],
      req
    );

    expect(result).toBe(handler);
  });

  it('пропускает неподходящие условия', async () => {
    const skipped = mock();
    const matched = mock(() => []);

    const result = await switchFunc(
      [
        { check: () => false, handler: skipped },
        { check: () => true, handler: matched },
      ],
      req
    );

    expect(skipped).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('возвращает [] если ни одно условие не совпало', async () => {
    const result = await switchFunc(
      [
        { check: () => false, handler: mock() },
        { check: () => false, handler: mock() },
      ],
      req
    );

    expect(result).toEqual([]);
  });

  it('возвращает [] для пустого списка условий', async () => {
    const result = await switchFunc([], req);
    expect(result).toEqual([]);
  });

  it('поддерживает асинхронный check', async () => {
    const handler = mock(() => []);

    const result = await switchFunc(
      [{ check: async () => true, handler }],
      req
    );

    expect(result).toEqual([]);
  });

  it('передаёт req в check и handler', async () => {
    const checkReqs: Request[] = [];
    const handlerReqs: Request[] = [];

    await switchFunc(
      [
        {
          check: (r) => {
            checkReqs.push(r);
            return true;
          },
          handler: (r) => {
            handlerReqs.push(r);
            return [];
          },
        },
      ],
      req
    );

    expect(checkReqs[0]).toBe(req);
    expect(handlerReqs[0]).toBe(req);
  });
});
