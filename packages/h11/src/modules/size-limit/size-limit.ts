import type { Handler } from '../../types.ts';
import { copyReq } from '../../utils/req/req.ts';

export const SIZE_1b = 1;
export const SIZE_1kb = 1024;
export const SIZE_1mb = 1024 * 1024;

// Тело оказалось больше лимита, но узнали об этом уже посреди чтения — ответ
// отдать самим нельзя, хендлер мог начать отвечать. Поэтому поток рвётся этой
// ошибкой: она всплывёт из чтения тела в onError, где приложение превратит её
// в 413.
export class BodyTooLargeError extends Error {
  limit: number;
  size: number;

  constructor({ limit, size }: { limit: number; size: number }) {
    super(`Body too large, max=${limit}, size=${size}`);
    this.limit = limit;
    this.size = size;
  }
}

// Лимит включительно: тело ровно в limit байт проходит, limit + 1 — уже нет.
// Одинаково и для заголовка, и для потока, иначе тело на границе проходило бы
// проверку content-length и падало при чтении.
export const createSizeLimitModule = (limit: number): Handler => {
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

        if (size > limit) {
          controller.error(new BodyTooLargeError({ limit, size }));
          return;
        }

        controller.enqueue(chunk);
      },
    });

    // Ошибка уже уехала в readable через controller.error — здесь её только
    // гасим, чтобы не было необработанного отказа промиса.
    ctx.req.body.pipeTo(writable).catch(() => {});

    ctx.req = copyReq(ctx.req, readable);
  };
};
