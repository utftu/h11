import { describe, expect, it } from 'bun:test';
import { cutPrefix, getFileEnt, parseEncodings, serveFiles } from './static.ts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { H11 } from '../core/core.ts';

describe('cutPrefix', () => {
  it('снимает префикс вместе со слэшем', () => {
    expect(cutPrefix('/h11x/main.js', '/h11x/')).toBe('main.js');
  });

  it('снимает ведущий слэш и при пустом префиксе', () => {
    expect(cutPrefix('/blog/first.html', '')).toBe('blog/first.html');
  });

  it('оставляет второй слэш — его отбросит joinUserPath', () => {
    expect(cutPrefix('//etc/passwd', '')).toBe('/etc/passwd');
  });
});

describe('parseEncodings', () => {
  it('разбирает обычный заголовок браузера', () => {
    expect(parseEncodings('gzip, deflate, br, zstd')).toEqual([
      'gzip',
      'deflate',
      'br',
      'zstd',
    ]);
  });

  it('отбрасывает вес и лишние пробелы', () => {
    expect(parseEncodings('br;q=1.0, gzip;q=0.8')).toEqual(['br', 'gzip']);
  });

  it('переживает отсутствие пробелов и пустой заголовок', () => {
    expect(parseEncodings('gzip,deflate')).toEqual(['gzip', 'deflate']);
    expect(parseEncodings(null)).toEqual([]);
  });
});

const makeDir = async (files: Record<string, string>) => {
  const dir = await mkdtemp(`${tmpdir()}/h11-static-`);

  for (const [name, content] of Object.entries(files)) {
    const parts = name.split('/');
    if (parts.length > 1) {
      await mkdir(`${dir}/${parts.slice(0, -1).join('/')}`, {
        recursive: true,
      });
    }

    await writeFile(`${dir}/${name}`, content);
  }

  return dir;
};

describe('getFileEnt', () => {
  it('находит файл и ставит content-type по расширению', async () => {
    const dir = await makeDir({ 'app.js': 'x' });

    const ent = await getFileEnt(`${dir}/app.js`, []);
    expect(ent?.filepath).toBe(`${dir}/app.js`);
    expect(ent?.headers['content-type']).toBe('text/javascript');

    await rm(dir, { recursive: true, force: true });
  });

  it('красивый url: /blog находит blog.html', async () => {
    const dir = await makeDir({ 'blog.html': 'x' });

    const ent = await getFileEnt(`${dir}/blog`, []);
    expect(ent?.filepath).toBe(`${dir}/blog.html`);
    expect(ent?.headers['content-type']).toBe('text/html; charset=utf-8');

    await rm(dir, { recursive: true, force: true });
  });

  it('каталог отдаёт свой index.html', async () => {
    const dir = await makeDir({ 'blog/index.html': 'x' });

    const ent = await getFileEnt(`${dir}/blog`, []);
    expect(ent?.filepath).toBe(`${dir}/blog/index.html`);

    await rm(dir, { recursive: true, force: true });
  });

  it('каталог с именем страницы не перекрывает саму страницу', async () => {
    const dir = await makeDir({ 'blog.html': 'x', 'blog/first.html': 'y' });

    const ent = await getFileEnt(`${dir}/blog`, []);
    expect(ent?.filepath).toBe(`${dir}/blog.html`);

    await rm(dir, { recursive: true, force: true });
  });

  it('берёт предсжатого соседа и помечает content-encoding', async () => {
    const dir = await makeDir({ 'app.js': 'x', 'app.js.br': 'сжато' });

    const ent = await getFileEnt(`${dir}/app.js`, ['gzip', 'br']);
    expect(ent?.filepath).toBe(`${dir}/app.js.br`);
    expect(ent?.headers['content-encoding']).toBe('br');
    expect(ent?.headers['content-type']).toBe('text/javascript');

    await rm(dir, { recursive: true, force: true });
  });

  it('не предлагает сжатое, если клиент его не просил', async () => {
    const dir = await makeDir({ 'app.js': 'x', 'app.js.br': 'сжато' });

    const ent = await getFileEnt(`${dir}/app.js`, ['gzip']);
    expect(ent?.filepath).toBe(`${dir}/app.js`);
    expect(ent?.headers['content-encoding']).toBeUndefined();

    await rm(dir, { recursive: true, force: true });
  });

  it('предсжатое работает и для красивого url', async () => {
    const dir = await makeDir({ 'blog.html': 'x', 'blog.html.gz': 'сжато' });

    const ent = await getFileEnt(`${dir}/blog`, ['gzip']);
    expect(ent?.filepath).toBe(`${dir}/blog.html.gz`);
    expect(ent?.headers['content-encoding']).toBe('gzip');

    await rm(dir, { recursive: true, force: true });
  });

  it('ничего не нашлось — undefined', async () => {
    const dir = await makeDir({});

    expect(await getFileEnt(`${dir}/nope`, [])).toBeUndefined();

    await rm(dir, { recursive: true, force: true });
  });
});

describe('serveFiles', () => {
  const exec = (h11: H11, path: string) =>
    h11.exec({ req: new Request(`http://x${path}`), data: {}, providers: {} });

  it('отдаёт файл по префиксу', async () => {
    const dir = await makeDir({ 'app.js': 'console.log(1)' });
    const h11 = new H11();
    h11.get('/assets/**', serveFiles({ dir, prefix: '/assets/' }));

    const res = await exec(h11, '/assets/app.js');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('console.log(1)');

    await rm(dir, { recursive: true, force: true });
  });

  it('файла нет — пропускает запрос дальше, а не отвечает своим 404', async () => {
    const dir = await makeDir({});
    const h11 = new H11();
    h11.get('/assets/**', serveFiles({ dir, prefix: '/assets/' }));
    h11.get('/assets/**', () => new Response('следующий'));

    expect(await (await exec(h11, '/assets/nope.js')).text()).toBe('следующий');

    await rm(dir, { recursive: true, force: true });
  });

  it('не выпускает за пределы каталога', async () => {
    const dir = await makeDir({ 'app.js': 'x' });
    const h11 = new H11();
    h11.get('/assets/**', serveFiles({ dir, prefix: '/assets/' }));

    const res = await exec(h11, '/assets/../../etc/passwd');
    expect(res.status).toBe(404);

    await rm(dir, { recursive: true, force: true });
  });
});
