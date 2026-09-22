import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { compressRecursive } from './compress.ts';
import { getFileEnt } from './static/static.ts';

const text = 'console.log("привет");'.repeat(50);

const makeDir = async (files: Record<string, string>) => {
  const dir = await mkdtemp(`${tmpdir()}/h11-compress-`);

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

describe('compressRecursive', () => {
  it('кладёт рядом с файлом все три формата', async () => {
    const dir = await makeDir({ 'app.js': text });

    await compressRecursive(dir);

    expect((await readdir(dir)).sort()).toEqual([
      'app.js',
      'app.js.br',
      'app.js.deflate',
      'app.js.gz',
    ]);

    await rm(dir, { recursive: true, force: true });
  });

  it('сжатое распаковывается в исходное', async () => {
    const dir = await makeDir({ 'app.js': text });

    await compressRecursive(dir);

    const gz = await Bun.file(`${dir}/app.js.gz`).bytes();
    expect(gunzipSync(gz).toString()).toBe(text);

    await rm(dir, { recursive: true, force: true });
  });

  it('спускается в подкаталоги', async () => {
    const dir = await makeDir({ 'nested/app.js': text });

    await compressRecursive(dir);

    expect((await readdir(`${dir}/nested`)).sort()).toEqual([
      'app.js',
      'app.js.br',
      'app.js.deflate',
      'app.js.gz',
    ]);

    await rm(dir, { recursive: true, force: true });
  });

  it('html не сжимает и сжатое повторно не трогает', async () => {
    const dir = await makeDir({ 'page.html': text, 'app.js': text });

    await compressRecursive(dir);
    await compressRecursive(dir);

    const files = await readdir(dir);
    expect(files).not.toContain('page.html.gz');
    expect(files).not.toContain('app.js.gz.gz');

    await rm(dir, { recursive: true, force: true });
  });

  it('результат подхватывается раздачей статики', async () => {
    const dir = await makeDir({ 'app.js': text });

    await compressRecursive(dir);
    const ent = await getFileEnt(`${dir}/app.js`, ['br']);

    expect(ent?.filepath).toBe(`${dir}/app.js.br`);
    expect(ent?.headers['content-encoding']).toBe('br');

    await rm(dir, { recursive: true, force: true });
  });
});
