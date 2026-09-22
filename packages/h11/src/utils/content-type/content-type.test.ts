import { describe, it, expect } from 'bun:test';
import { getMime, getMimeHeaders, getInit } from './content-type.ts';

describe('getMime', () => {
  it('берёт mime-тип по расширению файла', () => {
    expect(getMime('/h11x/about-CgDwyBSL.css')).toBe('text/css');
  });

  it('понимает голое расширение', () => {
    expect(getMime('.html')).toBe('text/html; charset=utf-8');
  });

  it('не путается с точками в каталогах', () => {
    expect(getMime('/var/www/site.ru/logo.svg')).toBe('image/svg+xml');
  });

  it('возвращает undefined для незнакомого расширения', () => {
    expect(getMime('/h11x/data.bin')).toBeUndefined();
  });
});

describe('getMimeHeaders', () => {
  it('отдаёт заголовок по пути файла', () => {
    expect(getMimeHeaders('/h11x/main.css')).toEqual({
      'content-type': 'text/css',
    });
  });

  it('для незнакомого расширения отдаёт пустой объект', () => {
    expect(getMimeHeaders('/h11x/data.bin')).toEqual({});
  });
});

describe('getInit', () => {
  it('ставит content-type по типу страницы', () => {
    const res = new Response('body', getInit({ mime: 'html' }));
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.status).toBe(200);
  });

  it('ставит код ответа', () => {
    const res = new Response('nope', getInit({ mime: 'txt', code: 404 }));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  it('принимает короткую позиционную форму', () => {
    const res = new Response('nope', getInit('json', 404, { etag: 'w/1' }));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(res.headers.get('etag')).toBe('w/1');
  });

  it('оставляет свои заголовки и работает без аргументов', () => {
    const res = new Response('body', getInit({ headers: { etag: 'w/1' } }));
    expect(res.headers.get('etag')).toBe('w/1');
    expect(res.headers.get('content-type')).toBeNull();
    expect(new Response('body', getInit()).status).toBe(200);
  });
});
