import { describe, expect, it } from 'bun:test';
import { cutPrefix, parseEncodings } from './static.ts';

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
