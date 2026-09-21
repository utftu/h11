import { describe, expect, it } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  checkFile,
  convertStreamToString,
  createCssLinkText,
  createScriptText,
  getEntName,
  getEntPath,
} from './utils.ts';

const makeRouteDir = async (files: string[]) => {
  const dir = `${tmpdir()}/h11x-utils-${process.pid}-${Date.now()}-${files.length}`;
  await mkdir(dir, { recursive: true });

  for (const file of files) {
    await writeFile(`${dir}/${file}`, '');
  }

  return dir;
};

describe('getEntName', () => {
  it('берёт последний сегмент пути', () => {
    expect(getEntName('/routes/about')).toBe('about');
  });

  it('работает без слэшей', () => {
    expect(getEntName('about')).toBe('about');
  });
});

describe('getEntPath', () => {
  it('заменяет последний сегмент pathname на имя dir', () => {
    expect(getEntPath('/routes/about/about.tsx', '/src/routes/other')).toBe(
      '/routes/about/other',
    );
  });
});

describe('createScriptText', () => {
  it('оборачивает src в module-скрипт с defer', () => {
    expect(createScriptText('/h11x/main.js')).toBe(
      '<script type="module" defer src="/h11x/main.js"></script>',
    );
  });
});

describe('createLinkText', () => {
  it('оборачивает href в stylesheet-ссылку', () => {
    expect(createCssLinkText('/h11x/main.css')).toBe(
      '<link rel="stylesheet" href="/h11x/main.css">',
    );
  });
});

describe('convertStreamToString', () => {
  it('склеивает чанки потока в строку', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello '));
        controller.enqueue(new TextEncoder().encode('world'));
        controller.close();
      },
    });

    expect(await convertStreamToString(stream)).toBe('hello world');
  });
});

describe('checkFile', () => {
  it('возвращает первый существующий вариант расширения (.ts перед .tsx)', async () => {
    const dir = await makeRouteDir(['about.ts', 'about.tsx']);

    expect(await checkFile(dir, 'about')).toBe(`${dir}/about.ts`);

    await rm(dir, { recursive: true, force: true });
  });

  it('берёт .tsx, если .ts не существует', async () => {
    const dir = await makeRouteDir(['about.tsx']);

    expect(await checkFile(dir, 'about')).toBe(`${dir}/about.tsx`);

    await rm(dir, { recursive: true, force: true });
  });

  it('бросает ошибку с путём, если нет ни одного варианта', async () => {
    const dir = await makeRouteDir([]);

    await expect(checkFile(dir, 'about')).rejects.toThrow(dir);

    await rm(dir, { recursive: true, force: true });
  });
});
