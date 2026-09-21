import { describe, expect, it } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { pid } from 'process';
import { rm } from 'node:fs/promises';
import { readConfig } from './assets.ts';
import {
  buildH11X,
  makeRouteUniversal,
  defaultPrefix,
  defaultDevPrefix,
} from './h11-x.ts';

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
  it('раздача ассетов и dev-монтирование vite разведены', () => {
    expect(defaultPrefix).toBe('/h11x');
    expect(defaultDevPrefix).toBe('/_vite');
  });
});

describe('buildH11X без роутов', () => {
  it('всё равно пишет config.json, чтобы createApp мог прочитать конфиг', async () => {
    const baseDir = `/tmp/h11x-test-${pid}-${Date.now()}/.h11x`;
    await mkdir(baseDir, { recursive: true });
    try {
      await buildH11X({ baseDir, routes: [] });
      const config = await readConfig(baseDir);
      expect(config.routes).toEqual({});
      expect(config.prefix).toBe(defaultPrefix);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
