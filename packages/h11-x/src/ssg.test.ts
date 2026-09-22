import { describe, expect, it } from 'bun:test';
import { getPageFile } from './ssg.ts';

describe('getPageFile', () => {
  it('раскладывает путь в файл внутри каталога ассетов', () => {
    expect(getPageFile('/blog')).toBe('blog.html');
    expect(getPageFile('/blog/first')).toBe('blog/first.html');
  });

  it('корень становится index.html', () => {
    expect(getPageFile('/')).toBe('index.html');
    expect(getPageFile('')).toBe('index.html');
  });

  it('лишние слэши не создают пустых сегментов', () => {
    expect(getPageFile('/blog/')).toBe('blog.html');
    expect(getPageFile('//blog//first//')).toBe('blog/first.html');
  });
});
