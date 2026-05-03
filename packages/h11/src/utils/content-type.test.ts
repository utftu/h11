import { describe, it, expect } from 'bun:test';
import {
  getContentType,
  getContentTypeHeaders,
  getContentTypeConfig,
} from './content-type.ts';

describe('content-type utils', () => {
  describe('getContentType', () => {
    it('возвращает mime-тип для js', () => {
      expect(getContentType('js')).toBe('text/javascript');
    });

    it('возвращает mime-тип для html с charset', () => {
      expect(getContentType('html')).toBe('text/html; charset=utf-8');
    });
  });

  describe('getContentTypeHeaders', () => {
    it('возвращает объект с content-type для js', () => {
      expect(getContentTypeHeaders('js')).toEqual({
        'content-type': 'text/javascript',
      });
    });

    it('возвращает объект с content-type для html', () => {
      expect(getContentTypeHeaders('html')).toEqual({
        'content-type': 'text/html; charset=utf-8',
      });
    });
  });

  describe('getContentTypeConfig', () => {
    it('оборачивает заголовки в { headers }', () => {
      expect(getContentTypeConfig('js')).toEqual({
        headers: { 'content-type': 'text/javascript' },
      });
    });

    it('совместим с конструктором Response', () => {
      const config = getContentTypeConfig('html');
      const res = new Response('body', config);
      expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    });
  });
});
