import { describe, expect, it } from 'bun:test';
import { copyReq } from './req.ts';

describe('copyReq', () => {
  it('сохраняет url, метод и заголовки', () => {
    const req = new Request('http://x/upload?a=1', {
      method: 'POST',
      headers: { 'x-token': 'abc' },
      body: 'старое',
    });

    const copy = copyReq(req, undefined);

    expect(copy.url).toBe('http://x/upload?a=1');
    expect(copy.method).toBe('POST');
    expect(copy.headers.get('x-token')).toBe('abc');
  });

  it('подменяет тело переданным потоком', async () => {
    const req = new Request('http://x/upload', {
      method: 'POST',
      body: 'старое',
    });

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('новое'));
        controller.close();
      },
    });

    expect(await copyReq(req, body).text()).toBe('новое');
  });

  it('без тела копия остаётся без тела', () => {
    const req = new Request('http://x/page');

    expect(copyReq(req, undefined).body).toBeNull();
  });
});
