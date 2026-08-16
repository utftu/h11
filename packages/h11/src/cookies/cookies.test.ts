import { describe, expect, it } from 'bun:test';
import {
  deleteCookie,
  getCookie,
  parseCookies,
  serializeCookie,
  setCookie,
} from './cookies.ts';

describe('parseCookies', () => {
  it('парсит несколько кук из заголовка', () => {
    const req = new Request('http://localhost', {
      headers: { cookie: 'a=1; b=2; c=3' },
    });

    expect(parseCookies(req)).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('декодирует URL-encoded значения', () => {
    const req = new Request('http://localhost', {
      headers: { cookie: 'name=hello%20world' },
    });

    expect(parseCookies(req)).toEqual({ name: 'hello world' });
  });

  it('не режет значение по всем "=" — только по первому (base64-паддинг и т.п.)', () => {
    const req = new Request('http://localhost', {
      // encodeURIComponent не трогает "=", так что после decode он остаётся как есть
      headers: { cookie: 'token=abc=def==' },
    });

    expect(parseCookies(req)).toEqual({ token: 'abc=def==' });
  });

  it('возвращает пустой объект без заголовка cookie', () => {
    const req = new Request('http://localhost');

    expect(parseCookies(req)).toEqual({});
  });

  it('игнорирует пары без "="', () => {
    const req = new Request('http://localhost', {
      headers: { cookie: 'a=1; garbage; b=2' },
    });

    expect(parseCookies(req)).toEqual({ a: '1', b: '2' });
  });
});

describe('getCookie', () => {
  it('возвращает значение конкретной куки по имени', () => {
    const req = new Request('http://localhost', {
      headers: { cookie: 'a=1; b=2' },
    });

    expect(getCookie(req, 'b')).toBe('2');
  });

  it('возвращает undefined, если такой куки нет', () => {
    const req = new Request('http://localhost', {
      headers: { cookie: 'a=1' },
    });

    expect(getCookie(req, 'missing')).toBeUndefined();
  });

  it('возвращает undefined без заголовка cookie вообще', () => {
    const req = new Request('http://localhost');

    expect(getCookie(req, 'a')).toBeUndefined();
  });
});

describe('serializeCookie', () => {
  it('кодирует значение и ставит Path=/ по умолчанию', () => {
    expect(serializeCookie('name', 'hello world')).toBe(
      'name=hello%20world; Path=/'
    );
  });

  it('добавляет опции в правильном порядке', () => {
    const expires = new Date('2030-01-01T00:00:00.000Z');

    const result = serializeCookie('session', 'abc', {
      maxAge: 3600,
      expires,
      path: '/app',
      domain: 'example.com',
      sameSite: 'Strict',
      secure: true,
      httpOnly: true,
    });

    expect(result).toBe(
      `session=abc; Max-Age=3600; Expires=${expires.toUTCString()}; Path=/app; Domain=example.com; SameSite=Strict; Secure; HttpOnly`
    );
  });

  it('автоматически добавляет Secure для SameSite=None, если secure не указан', () => {
    expect(serializeCookie('a', '1', { sameSite: 'None' })).toBe(
      'a=1; Path=/; SameSite=None; Secure'
    );
  });

  it('уважает явный secure: false даже с SameSite=None', () => {
    expect(serializeCookie('a', '1', { sameSite: 'None', secure: false })).toBe(
      'a=1; Path=/; SameSite=None'
    );
  });

  it('не добавляет Secure для SameSite=Strict/Lax без явного secure', () => {
    expect(serializeCookie('a', '1', { sameSite: 'Lax' })).toBe(
      'a=1; Path=/; SameSite=Lax'
    );
  });
});

describe('setCookie', () => {
  it('добавляет Set-Cookie через append (не затирая предыдущий)', () => {
    const res = new Response();

    setCookie(res, 'a', '1');
    setCookie(res, 'b', '2');

    expect(res.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=2; Path=/']);
  });
});

describe('deleteCookie', () => {
  it('ставит Max-Age=0 и Expires в прошлом', () => {
    const res = new Response();

    deleteCookie(res, 'session');

    const [cookie] = res.headers.getSetCookie();
    expect(cookie).toContain('session=;');
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });
});
