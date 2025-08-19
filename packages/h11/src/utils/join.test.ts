import { describe, expect, it } from 'vitest';
import { joinUserPath } from './join.ts';

describe('joinUserPath', () => {
  it('склеивает относительный путь', () => {
    expect(joinUserPath('/static', 'images/cat.jpg')).toBe(
      '/static/images/cat.jpg'
    );
  });

  it('игнорирует "." сегменты', () => {
    expect(joinUserPath('/static', './a/./b/.')).toBe('/static/a/b');
  });

  it('возвращает "" при попытке абсолютного пути', () => {
    expect(joinUserPath('/static', '/etc/passwd')).toBe('');
  });

  it('возвращает "" при использовании ".."', () => {
    expect(joinUserPath('/static', 'a/../b')).toBe('');
    expect(joinUserPath('/static', '../secret')).toBe('');
    expect(joinUserPath('/static', '..')).toBe('');
  });

  it('обрабатывает пустой userPath корректно', () => {
    expect(joinUserPath('/static', '')).toBe('/static/');
  });

  it('не добавляет лишний слэш при basePath со слэшем', () => {
    expect(joinUserPath('/static/', 'a/b')).toBe('/static/a/b');
  });

  it('нормализует множественные слэши внутри userPath', () => {
    expect(joinUserPath('/static', 'a//b///c')).toBe('/static/a/b/c');
  });

  it('поддерживает нестандартные сегменты', () => {
    expect(joinUserPath('/static', '.../data')).toBe('/static/.../data');
  });
});
