import { describe, expect, it } from 'bun:test';
import { cutPrefix } from './serve.ts';

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
