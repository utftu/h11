import { describe, expect, it } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { pid } from 'process';
import { fsApi } from 'h11';
import { buildH11X, makeRouteUniversal, prefix, devPrefix } from './h11-x.ts';

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

describe('buildH11X без роутов', () => {
  it('всё равно пишет ssr/config.json, чтобы createH11XApp мог прочитать конфиг', async () => {
    const baseDir = `/tmp/h11x-test-${pid}-${Date.now()}/.h11x`;
    await mkdir(baseDir, { recursive: true });
    try {
      await buildH11X({ baseDir, routes: [] });
      const exists = await fsApi.checkExist(`${baseDir}/ssr/config.json`);
      expect(exists).toBe(true);
    } finally {
      await fsApi.rm(baseDir);
    }
  });
});
