import { describe, it, expect } from 'bun:test';
import { createRateLimiterModule, SIZE_1mb } from './limit.ts';

const makeCtx = (headers: Record<string, string> = {}, body?: BodyInit) => ({
  req: new Request('http://localhost/', {
    method: 'POST',
    headers,
    body: body ?? null,
  }),
  data: {},
  providers: {},
  params: {},
  h11: {} as any,
});

describe('createRateLimiterModule', () => {
  it('возвращает 413 когда content-length превышает лимит', async () => {
    const handler = createRateLimiterModule(100);
    const ctx = makeCtx({ 'content-length': '200' });

    const res = await handler(ctx);

    expect(res?.status).toBe(413);
  });

  it('пропускает запрос когда content-length в пределах лимита', async () => {
    const handler = createRateLimiterModule(100);
    const ctx = makeCtx({ 'content-length': '50' });

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('пропускает запрос без тела', async () => {
    const handler = createRateLimiterModule(100);
    const ctx = makeCtx();

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('пропускает без ошибки при content-length равном лимиту', async () => {
    const handler = createRateLimiterModule(100);
    const ctx = makeCtx({ 'content-length': '100' });

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('заменяет req на новый с прокси-стримом', async () => {
    const handler = createRateLimiterModule(SIZE_1mb);
    const ctx = makeCtx({}, 'hello world');
    const originalReq = ctx.req;

    await handler(ctx);

    expect(ctx.req).not.toBe(originalReq);
    expect(ctx.req.method).toBe('POST');
  });

  it('проксированное тело читается без изменений', async () => {
    const handler = createRateLimiterModule(SIZE_1mb);
    const ctx = makeCtx({}, 'hello');

    await handler(ctx);

    const text = await ctx.req.text();
    expect(text).toBe('hello');
  });
});
