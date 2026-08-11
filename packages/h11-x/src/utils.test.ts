import { describe, expect, it } from 'bun:test';
import type { FsApi } from 'h11';
import {
  checkFile,
  convertStreamToString,
  createScriptText,
  getEntName,
  getEntPath,
} from './utils.ts';

const fakeFsApi = (existing: string[]): FsApi =>
  ({
    checkExist: async (path: string) => existing.includes(path),
  }) as FsApi;

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
    const fsApi = fakeFsApi(['/routes/about/about.ts', '/routes/about/about.tsx']);

    const result = await checkFile('/routes/about', 'about', fsApi);
    expect(result).toBe('/routes/about/about.ts');
  });

  it('падает на .tsx, если .ts не существует', async () => {
    const fsApi = fakeFsApi(['/routes/about/about.tsx']);

    const result = await checkFile('/routes/about', 'about', fsApi);
    expect(result).toBe('/routes/about/about.tsx');
  });

  it('бросает ошибку, если нет ни одного варианта', async () => {
    const fsApi = fakeFsApi([]);

    await expect(checkFile('/routes/about', 'about', fsApi)).rejects.toThrow(
      'Unknown file pattern',
    );
  });
});
