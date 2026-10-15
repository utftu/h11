import { describe, it, expect } from 'bun:test';
import { getIp } from './ip.ts';

const makeReq = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/hello', { headers });

describe('getIp', () => {
  it('берёт первый хоп из x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });

    expect(getIp({ req, providers: {} })).toBe('203.0.113.7');
  });

  it('без заголовка берёт адрес сокета у провайдера', () => {
    const providers = {
      bun: { server: { requestIP: () => ({ address: '198.51.100.4' }) } },
    };

    expect(getIp({ req: makeReq(), providers })).toBe('198.51.100.4');
  });

  it('заголовок важнее сокета — за прокси в сокете сам прокси', () => {
    const providers = {
      bun: { server: { requestIP: () => ({ address: '127.0.0.1' }) } },
    };
    const req = makeReq({ 'x-forwarded-for': '203.0.113.7' });

    expect(getIp({ req, providers })).toBe('203.0.113.7');
  });

  it('без провайдера и без заголовка — undefined', () => {
    expect(getIp({ req: makeReq(), providers: {} })).toBeUndefined();
  });

  it('режет чужое значение по длине ipv6', () => {
    const req = makeReq({ 'x-forwarded-for': 'x'.repeat(200) });

    expect(getIp({ req, providers: {} })).toHaveLength(45);
  });
  it('ipv4 из двустекового сокета печатается без ::ffff:', () => {
    const providers = {
      bun: { server: { requestIP: () => ({ address: '::ffff:127.0.0.1' }) } },
    };

    expect(getIp({ req: makeReq(), providers })).toBe('127.0.0.1');
  });

  it('настоящий ipv6 остаётся как есть', () => {
    const providers = {
      bun: { server: { requestIP: () => ({ address: '::1' }) } },
    };

    expect(getIp({ req: makeReq(), providers })).toBe('::1');
  });
});
