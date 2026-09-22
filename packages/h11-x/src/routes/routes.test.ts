import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { getProjectRoutes, getRoutes } from './routes.ts';

const makeTree = async (files: string[]) => {
  const root = await mkdtemp(`${tmpdir()}/h11x-tree-`);

  if (files.length === 0) {
    return root;
  }

  for (const file of files) {
    const parts = file.split('/');
    await mkdir(`${root}/${parts.slice(0, -1).join('/')}`, { recursive: true });
    await writeFile(`${root}/${file}`, '');
  }

  return root;
};

describe('getRoutes', () => {
  it('папка с файлом по конвенции становится роутом', async () => {
    const root = await makeTree([
      'about/about.ssr.tsx',
      'about/about.client.tsx',
    ]);

    expect(await getRoutes(root)).toEqual([
      { dir: `${root}/about`, name: 'about' },
    ]);

    await rm(root, { recursive: true, force: true });
  });

  it('имя вложенного роута — путь от корня, а не имя папки', async () => {
    const root = await makeTree(['blog/aleksei/aleksei.ssr.tsx']);

    expect(await getRoutes(root)).toEqual([
      { dir: `${root}/blog/aleksei`, name: 'blog/aleksei' },
    ]);

    await rm(root, { recursive: true, force: true });
  });

  it('папка без файла по конвенции роутом не считается', async () => {
    const root = await makeTree(['_shared/button.tsx']);

    expect(await getRoutes(root)).toEqual([]);

    await rm(root, { recursive: true, force: true });
  });

  it('находит несколько роутов на разной глубине', async () => {
    const root = await makeTree([
      'about/about.client.tsx',
      'blog/first/first.ssg.tsx',
    ]);

    const routes = await getRoutes(root);

    expect(routes.map((route) => route.name).sort()).toEqual([
      'about',
      'blog/first',
    ]);

    await rm(root, { recursive: true, force: true });
  });

  it('несуществующего каталога достаточно, чтобы вернуть пусто', async () => {
    expect(await getRoutes('/nope/nope/nope')).toEqual([]);
  });
});

describe('getProjectRoutes', () => {
  it('ищет роуты в src/routes переданного корня', async () => {
    const root = await makeTree(['src/routes/about/about.ssr.tsx']);

    expect(await getProjectRoutes(root)).toEqual([
      { dir: `${root}/src/routes/about`, name: 'about' },
    ]);

    await rm(root, { recursive: true, force: true });
  });

  it('в проекте без src/routes роутов нет', async () => {
    const root = await makeTree([]);

    expect(await getProjectRoutes(root)).toEqual([]);

    await rm(root, { recursive: true, force: true });
  });
});
