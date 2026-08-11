import { describe, expect, it } from 'bun:test';
import { makeRouteUniversal, prefix, devPrefix } from './h11-x.ts';

describe('makeRouteUniversal', () => {
  it('превращает строку в Route, выводя name из последнего сегмента', () => {
    expect(makeRouteUniversal('/src/routes/about')).toEqual({
      dir: '/src/routes/about',
      name: 'about',
    });
  });

  it('пропускает готовый Route без изменений', () => {
    const route = { dir: '/src/routes/about', name: 'custom-name' };
    expect(makeRouteUniversal(route)).toBe(route);
  });
});

describe('дефолтные префиксы', () => {
  it('prefix и devPrefix согласованы: devPrefix = joinPath-эквивалент "/_vite" + prefix', () => {
    expect(prefix).toBe('/h11x');
    expect(devPrefix).toBe('/_vite/h11x');
    expect(devPrefix.endsWith(prefix)).toBe(true);
  });
});
