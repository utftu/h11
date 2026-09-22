import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm as rmDir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

describe('buildH11X: проверка файлов роута', () => {
  // Валидация роутов идёт до единой vite-сборки, поэтому такие случаи падают
  // ещё до того, как что-то соберётся — каталоги можно не наполнять.
  const makeRoute = async (files: string[]) => {
    const baseDir = await mkdtemp(`${tmpdir()}/h11x-routes-`);
    const dir = `${baseDir}/about`;
    await mkdir(dir, { recursive: true });

    for (const file of files) {
      await writeFile(`${dir}/${file}`, '');
    }

    return { baseDir, dir };
  };

  const build = (baseDir: string, dir: string) =>
    buildH11X({ baseDir: `${baseDir}/.h11x`, routes: [dir] });

  it('пустая папка роута', async () => {
    const { baseDir, dir } = await makeRoute([]);

    expect(build(baseDir, dir)).rejects.toThrow('No .client, .ssr or .ssg');

    await rmDir(baseDir, { recursive: true, force: true });
  });

  it('только .client — рендерить нечего', async () => {
    const { baseDir, dir } = await makeRoute(['about.client.tsx']);

    expect(build(baseDir, dir)).rejects.toThrow('nothing to render');

    await rmDir(baseDir, { recursive: true, force: true });
  });

  it('.ssr без .client — некому гидрировать', async () => {
    const { baseDir, dir } = await makeRoute(['about.ssr.tsx']);

    expect(build(baseDir, dir)).rejects.toThrow('but no .client file');

    await rmDir(baseDir, { recursive: true, force: true });
  });

  it('.ssr и .ssg вместе — непонятно, какой режим', async () => {
    const { baseDir, dir } = await makeRoute([
      'about.client.tsx',
      'about.ssr.tsx',
      'about.ssg.tsx',
    ]);

    expect(build(baseDir, dir)).rejects.toThrow('pick one mode');

    await rmDir(baseDir, { recursive: true, force: true });
  });
});
