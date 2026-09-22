import { describe, it, expect } from 'bun:test';
import {
  BodyTooLargeError,
  createSizeLimitModule,
  SIZE_1mb,
} from './size-limit.ts';
import { H11 } from '../../core/core.ts';

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
  reqId: 'test-req-id',
});

describe('createSizeLimitModule', () => {
  it('возвращает 413 когда content-length превышает лимит', async () => {
    const handler = createSizeLimitModule(100);
    const ctx = makeCtx({ 'content-length': '200' });

    const res = await handler(ctx);

    expect(res?.status).toBe(413);
  });

  it('пропускает запрос когда content-length в пределах лимита', async () => {
    const handler = createSizeLimitModule(100);
    const ctx = makeCtx({ 'content-length': '50' });

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('пропускает запрос без тела', async () => {
    const handler = createSizeLimitModule(100);
    const ctx = makeCtx();

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('пропускает без ошибки при content-length равном лимиту', async () => {
    const handler = createSizeLimitModule(100);
    const ctx = makeCtx({ 'content-length': '100' });

    const res = await handler(ctx);

    expect(res).toBeUndefined();
  });

  it('заменяет req на новый с прокси-стримом', async () => {
    const handler = createSizeLimitModule(SIZE_1mb);
    const ctx = makeCtx({}, 'hello world');
    const originalReq = ctx.req;

    await handler(ctx);

    expect(ctx.req).not.toBe(originalReq);
    expect(ctx.req.method).toBe('POST');
  });

  it('проксированное тело читается без изменений', async () => {
    const handler = createSizeLimitModule(SIZE_1mb);
    const ctx = makeCtx({}, 'hello');

    await handler(ctx);

    const text = await ctx.req.text();
    expect(text).toBe('hello');
  });
});

describe('граница лимита', () => {
  // content-length у Request в памяти не проставляется сам, а в боевом
  // запросе он есть — поэтому в тестах ставим руками.
  const exec = (h11: H11, body: string) =>
    h11.exec({
      req: new Request('http://x/upload', {
        method: 'POST',
        body,
        headers: { 'content-length': String(body.length) },
      }),
      data: {},
      providers: {},
    });

  const makeApp = (limit: number) => {
    const h11 = new H11();
    h11.use(createSizeLimitModule(limit));
    h11.post('/upload', async ({ req }) => new Response(await req.text()));

    return h11;
  };

  it('тело ровно в лимит проходит', async () => {
    const res = await exec(makeApp(5), '12345');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('12345');
  });

  it('на байт больше — 413 по content-length', async () => {
    const res = await exec(makeApp(5), '123456');

    expect(res.status).toBe(413);
  });

  it('превышение в потоке рвёт чтение тела BodyTooLargeError', async () => {
    const h11 = new H11();
    h11.use(createSizeLimitModule(5));

    let caught: unknown;
    h11.post('/upload', async ({ req }) => {
      caught = await req.text().catch((error) => error);
      return new Response('ok');
    });

    // Без content-length: тело уезжает потоком, и превышение видно только
    // при чтении.
    await h11.exec({
      req: new Request('http://x/upload', {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('123456789'));
            controller.close();
          },
        }),
      }),
      data: {},
      providers: {},
    });

    expect(caught).toBeInstanceOf(BodyTooLargeError);
    expect((caught as BodyTooLargeError).limit).toBe(5);
  });
});
