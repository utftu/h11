import { describe, it, expect, spyOn } from 'bun:test';
import type { ResponseEvent } from 'h11';
import { createLogReq } from './log.ts';

const makeEvent = ({
  url = 'http://localhost/about',
  status = 200,
  type = 'text/html; charset=utf-8',
  error,
}: {
  url?: string;
  status?: number;
  type?: string;
  error?: Error;
} = {}): ResponseEvent => ({
  req: new Request(url, { headers: { 'x-forwarded-for': '203.0.113.7' } }),
  res: new Response(null, { status, headers: { 'content-type': type } }),
  reqId: '37c0b04f-d591-4c3d-bf3e-fd5fd8f8744a',
  ms: 5.31,
  providers: {},
  error,
});

const catchLogs = (run: () => void) => {
  const spy = spyOn(console, 'log').mockImplementation(() => {});
  run();
  const lines = spy.mock.calls.map((call) => call[0]);
  spy.mockRestore();

  return lines;
};

const prefixes = { prefix: '/h11x', devPrefix: '/_vite/h11x' };

describe('createLogReq', () => {
  it('печатает страницу', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() => logReq(makeEvent()));

    expect(lines).toEqual(['GET 200 /about 5.3ms 203.0.113.7 37c0b04f']);
  });

  it('молчит про удачно отданные ассеты и файлы vite', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() => {
      logReq(
        makeEvent({
          url: 'http://localhost/h11x/about.client-BvRk.js',
          type: 'text/javascript',
        }),
      );
      logReq(
        makeEvent({
          url: 'http://localhost/_vite/h11x/src/styles.css?direct',
          type: 'text/css',
        }),
      );
    });

    expect(lines).toEqual([]);
  });

  it('с static: true печатает и ассеты', () => {
    const logReq = createLogReq({ ...prefixes, static: true });
    const lines = catchLogs(() =>
      logReq(
        makeEvent({
          url: 'http://localhost/h11x/about.client-BvRk.js',
          type: 'text/javascript',
        }),
      ),
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('/h11x/about.client-BvRk.js');
  });

  it('html под префиксом раздачи печатается всегда — это страница', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() =>
      logReq(makeEvent({ url: 'http://localhost/h11x/blog.html' })),
    );

    expect(lines).toHaveLength(1);
  });

  it('пропавший или упавший ассет печатается — это не шум', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() => {
      logReq(
        makeEvent({
          url: 'http://localhost/h11x/gone.js',
          type: 'text/javascript',
          status: 404,
        }),
      );
      logReq(
        makeEvent({
          url: 'http://localhost/h11x/boom.js',
          type: 'text/javascript',
          status: 500,
        }),
      );
    });

    expect(lines).toHaveLength(2);
  });

  it('query по умолчанию не печатается', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() =>
      logReq(makeEvent({ url: 'http://localhost/signin?token=секрет' })),
    );

    expect(lines[0]).toBe('GET 200 /signin 5.3ms 203.0.113.7 37c0b04f');
  });

  it('с query: true печатается вместе со строкой запроса', () => {
    const logReq = createLogReq({ ...prefixes, query: true });
    const lines = catchLogs(() =>
      logReq(makeEvent({ url: 'http://localhost/search?q=1' })),
    );

    expect(lines[0]).toContain('/search?q=1');
  });

  it('стек печатает второй строкой', () => {
    const logReq = createLogReq(prefixes);
    const lines = catchLogs(() =>
      logReq(makeEvent({ status: 500, error: new Error('сломалось') })),
    );

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('at ');
  });
});
