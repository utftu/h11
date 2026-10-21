import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { pid } from 'node:process';
import { readConfig } from '../assets/assets.ts';
import { tmpdir } from 'node:os';
import {
  buildH11X,
  makeRouteUniversal,
  defaultPrefix,
  defaultDevPrefix,
} from './build.ts';
import type { EditViteConfigProps } from '../types.ts';

// Каталоги тестовых проектов. Уборка в afterEach, а не в конце теста: упавший
// тест иначе оставляет их в пакете, и они копятся.
const trash: string[] = [];

afterEach(async () => {
  for (const path of trash) {
    await rm(path, { recursive: true, force: true });
  }

  trash.length = 0;
});

describe('editViteConfig', () => {
  it('получает режим роута, цель сборки и сам роут', async () => {
    const root = await mkdtemp(`${tmpdir()}/h11x-hook-`);
    trash.push(root);
    const dir = `${root}/about`;
    await mkdir(dir, { recursive: true });
    await writeFile(
      `${dir}/about.ssr.tsx`,
      `export const pages = [];\nexport const page = () => '';\n`,
    );
    await writeFile(`${dir}/about.client.tsx`, `export const client = 1;\n`);

    const calls: EditViteConfigProps[] = [];

    await buildH11X({
      baseDir: `${root}/.h11x`,
      routes: [dir],
      prod: true,
      editViteConfig: (props, config) => {
        calls.push(props);
        return config;
      },
    });

    expect(calls).toEqual([
      { mode: 'ssr', target: 'server', route: { dir, name: 'about' } },
      { mode: 'ssr', target: 'client', route: { dir, name: 'about' } },
    ]);
  });
});

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
      await buildH11X({ baseDir, routes: [], prod: true });
      const config = await readConfig(baseDir);
      expect(config.routes).toEqual({});
      expect(config.prefix).toBe(defaultPrefix);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});

describe('buildH11X без режима', () => {
  it('падает и не трогает каталог сборки', async () => {
    const baseDir = `/tmp/h11x-test-${pid}-${Date.now()}/.h11x`;
    await mkdir(baseDir, { recursive: true });
    await writeFile(`${baseDir}/заметка`, 'готовая сборка');

    try {
      // prod не передан, а NODE_ENV под bun test — "test", то есть режим
      // непонятен. Дальше каталог сносится целиком, поэтому падаем раньше.
      await expect(buildH11X({ baseDir })).rejects.toThrow('No mode');
      expect(await Bun.file(`${baseDir}/заметка`).exists()).toBe(true);
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
    trash.push(baseDir);
    const dir = `${baseDir}/about`;
    await mkdir(dir, { recursive: true });

    for (const file of files) {
      await writeFile(`${dir}/${file}`, '');
    }

    return { baseDir, dir };
  };

  const build = (baseDir: string, dir: string) =>
    buildH11X({ baseDir: `${baseDir}/.h11x`, routes: [dir], prod: true });

  it('пустая папка роута', async () => {
    const { baseDir, dir } = await makeRoute([]);

    expect(build(baseDir, dir)).rejects.toThrow('No .client, .ssr or .ssg');
  });

  it('только .client — рендерить нечего', async () => {
    const { baseDir, dir } = await makeRoute(['about.client.tsx']);

    expect(build(baseDir, dir)).rejects.toThrow('nothing to render');
  });

  it('.ssr без .client — некому гидрировать', async () => {
    const { baseDir, dir } = await makeRoute(['about.ssr.tsx']);

    expect(build(baseDir, dir)).rejects.toThrow('but no .client file');
  });

  it('.ssr и .ssg вместе — непонятно, какой режим', async () => {
    const { baseDir, dir } = await makeRoute([
      'about.client.tsx',
      'about.ssr.tsx',
      'about.ssg.tsx',
    ]);

    expect(build(baseDir, dir)).rejects.toThrow('pick one mode');
  });
});

describe('алиасы приложения', () => {
  it('собираются в серверный модуль, а не остаются импортом', async () => {
    // Внутри пакета, а не в /tmp: снаружи воркспейса не разрешается импорт
    // h11-x, а серверному модулю роута он нужен.
    const root = `${import.meta.dir}/../../.test-project-alias-${pid}`;
    trash.push(root);
    const dir = `${root}/src/routes/about`;
    await mkdir(`${root}/src/locales`, { recursive: true });
    await mkdir(dir, { recursive: true });

    await writeFile(
      `${root}/src/locales/ru.json`,
      JSON.stringify({ title: 'ВШИТЫЙ_ЗАГОЛОВОК', unused: 'ЛИШНИЙ_КЛЮЧ' }),
    );
    await writeFile(
      `${dir}/about.tsx`,
      `import {Template} from 'h11-x/client';
import * as t from '@locale';
export const About = () => <Template lang="ru"><h1>{t.title}</h1></Template>;
`,
    );
    await writeFile(
      `${dir}/about.ssr.tsx`,
      `import {createPage} from 'h11-x';
import {About} from './about.tsx';
export const page = createPage(About);
`,
    );
    await writeFile(
      `${dir}/about.client.tsx`,
      `import {hydratePage} from 'h11-x/client';
import {About} from './about.tsx';
hydratePage(About);
`,
    );

    await buildH11X({
      root,
      prod: true,
      viteBase: () => ({
        resolve: { alias: { '@locale': `${root}/src/locales/ru.json` } },
      }),
    });

    const server = await Bun.file(`${root}/.h11x/ssr/about.js`).text();


    // Строка вшита, импорта наружу не осталось: иначе прод падал бы при
    // старте, а сборка проходила молча.
    expect(server).toContain('ВШИТЫЙ_ЗАГОЛОВОК');
    expect(server).not.toContain('@locale');
    // Неиспользованный ключ выброшен — на обеих сборках.
    expect(server).not.toContain('ЛИШНИЙ_КЛЮЧ');
  }, 60_000);

  it('не мешает приложению задать внешность самому', async () => {
    const root = await mkdtemp(`${tmpdir()}/h11x-ext-`);
    trash.push(root);
    const dir = `${root}/about`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/about.ssr.tsx`, `export const page = () => '';\n`);
    await writeFile(`${dir}/about.client.tsx`, `export const client = 1;\n`);

    const seen: unknown[] = [];

    await buildH11X({
      baseDir: `${root}/.h11x`,
      routes: [dir],
      prod: true,
      viteBase: () => ({ build: { rollupOptions: { external: ['своё'] } } }),
      editViteConfig: (props, config) => {
        if (props.target === 'server') {
          seen.push(config.build?.rollupOptions?.external);
        }
        return config;
      },
    });


    expect(seen).toEqual([['своё']]);
  }, 60_000);
});
