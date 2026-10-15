import { describe, it, expect, spyOn } from 'bun:test';
import { logReq } from './log.ts';
import type { ResponseEvent } from '../types.ts';

const makeEvent = ({
  url = 'http://localhost/about',
  method = 'GET',
  status = 200,
  ms = 59.14,
  headers = {},
  providers = {},
  error,
}: {
  url?: string;
  method?: string;
  status?: number;
  ms?: number;
  headers?: Record<string, string>;
  providers?: Record<string, any>;
  error?: Error;
} = {}): ResponseEvent => ({
  req: new Request(url, { method, headers }),
  res: new Response(null, { status }),
  reqId: '37c0b04f-d591-4c3d-bf3e-fd5fd8f8744a',
  ms,
  providers,
  error,
});

const catchLogs = (run: () => void) => {
  const spy = spyOn(console, 'log').mockImplementation(() => {});
  run();
  const lines = spy.mock.calls.map((call) => call[0]);
  spy.mockRestore();

  return lines;
};

describe('logReq', () => {
  it('печатает метод, статус, путь, время, ip и короткий reqId', () => {
    const lines = catchLogs(() =>
      logReq(makeEvent({ headers: { 'x-forwarded-for': '203.0.113.7' } })),
    );

    expect(lines).toEqual(['GET 200 /about 59.1ms 203.0.113.7 37c0b04f']);
  });

  it('без известного ip ставит прочерк, чтобы поля не съехали', () => {
    const lines = catchLogs(() => logReq(makeEvent()));

    expect(lines[0]).toBe('GET 200 /about 59.1ms - 37c0b04f');
  });

  it('берёт ip от провайдера, когда заголовка нет', () => {
    const providers = {
      bun: { server: { requestIP: () => ({ address: '198.51.100.4' }) } },
    };
    const lines = catchLogs(() => logReq(makeEvent({ providers })));

    expect(lines[0]).toContain(' 198.51.100.4 ');
  });

  it('оставляет query в пути, но не хост', () => {
    const lines = catchLogs(() =>
      logReq(makeEvent({ url: 'http://localhost/search?q=1' })),
    );

    expect(lines[0]).toBe('GET 200 /search?q=1 59.1ms - 37c0b04f');
  });

  it('стек печатает второй строкой и только когда есть error', () => {
    const error = new Error('сломалось');
    const lines = catchLogs(() => logReq(makeEvent({ status: 500, error })));

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('GET 500 /about 59.1ms - 37c0b04f');
    expect(lines[1]).toContain('at ');
  });

  it('пятисотая без исключения остаётся одной строкой', () => {
    const lines = catchLogs(() => logReq(makeEvent({ status: 500 })));

    expect(lines).toHaveLength(1);
  });
});
