import type { Handler } from '../types.ts';

export const SIZE_1b = 1;
export const SIZE_1kb = 1;
export const SIZE_1mb = 1024 * 1024;

export const copyReq = (req: Request, body: ReadableStream | void) => {
  const newReq = new Request(req.url, {
    ...req,
    body: body ?? undefined,
  });
  return newReq;
};

export const createRateLimiterModule = (limit: number): Handler => {
  return (ctx) => {
    const len = ctx.req.headers.get('content-length');
    if (len && parseInt(len) > limit) {
      return new Response('Payload Too Large', { status: 413 });
    }

    if (!ctx.req.body) {
      return;
    }

    let size = 0;

    const { readable, writable } = new TransformStream<Uint8Array>({
      transform: (chunk, controller) => {
        size += chunk.byteLength;

        if (size >= limit) {
          controller.error(
            new Error(`Limit exceeded, max=${limit}, size=${size}`)
          );
          return;
        }

        controller.enqueue(chunk); // передаём дальше
      },
    });

    (async () => {
      try {
        await ctx.req.body?.pipeTo(writable);
      } catch (_) {}
    })();

    const newReq = copyReq(ctx.req, readable);
    ctx.req = newReq;
  };
};
