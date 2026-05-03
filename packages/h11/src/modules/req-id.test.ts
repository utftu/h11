import { describe, it, expect } from 'bun:test';
import { createReqIdModule, REQUEST_ID_HEADER } from './req-id.ts';

const makeCtx = (headers: Record<string, string> = {}) => ({
  req: new Request('http://localhost/', { headers }),
  data: {} as any,
  providers: {},
  params: {},
  h11: {} as any,
});

describe('createReqIdModule', () => {
  it('берёт reqId из заголовка если он есть', () => {
    const mod = createReqIdModule();
    const ctx = makeCtx({ [REQUEST_ID_HEADER]: 'abc-123' });

    mod(ctx);

    expect(ctx.data.reqId).toBe('abc-123');
  });

  it('генерирует UUID если заголовок отсутствует', () => {
    const mod = createReqIdModule();
    const ctx = makeCtx();

    mod(ctx);

    expect(ctx.data.reqId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('разные вызовы без заголовка дают разные UUID', () => {
    const mod = createReqIdModule();
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();

    mod(ctx1);
    mod(ctx2);

    expect(ctx1.data.reqId).not.toBe(ctx2.data.reqId);
  });

  it('поддерживает кастомное имя заголовка', () => {
    const mod = createReqIdModule('x-trace-id');
    const ctx = makeCtx({ 'x-trace-id': 'trace-999' });

    mod(ctx);

    expect(ctx.data.reqId).toBe('trace-999');
  });

  it('не читает стандартный заголовок при кастомном имени', () => {
    const mod = createReqIdModule('x-trace-id');
    const ctx = makeCtx({ [REQUEST_ID_HEADER]: 'should-be-ignored' });

    mod(ctx);

    expect(ctx.data.reqId).not.toBe('should-be-ignored');
  });
});
