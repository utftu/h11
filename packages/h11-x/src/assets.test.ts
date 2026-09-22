import { describe, expect, it } from 'bun:test';
import { collectClientOut, createAssetsHtml, getAssets } from './assets.ts';
import type { ConfigH11X } from './types.ts';

const chunk = (fileName: string, isEntry: boolean) =>
  ({ type: 'chunk', fileName, isEntry }) as any;

const asset = (fileName: string, src?: string) =>
  ({ type: 'asset', fileName, originalFileNames: src ? [src] : [] }) as any;

const routeDir = `${process.cwd()}/src/routes/about`;

describe('collectClientOut', () => {
  it('разносит выход сборки по типам', () => {
    const out = collectClientOut(
      [
        chunk('about.client-abc.js', true),
        chunk('vendor-def.js', false),
        asset('about-ghi.css'),
        asset('logo-jkl.svg', 'src/routes/about/logo.svg'),
      ],
      routeDir,
    );

    expect(out.js).toEqual(['about.client-abc.js']);
    expect(out.chunks).toEqual(['vendor-def.js']);
    expect(out.css).toEqual(['about-ghi.css']);
    expect(out.assets).toEqual([{ src: 'logo.svg', file: 'logo-jkl.svg' }]);
  });

  it('несколько entry-чанков не теряются', () => {
    const out = collectClientOut(
      [chunk('one-a.js', true), chunk('two-b.js', true)],
      routeDir,
    );

    expect(out.js).toEqual(['one-a.js', 'two-b.js']);
  });

  it('вложенный ассет сохраняет путь от папки роута', () => {
    const out = collectClientOut(
      [asset('logo-pqr.svg', 'src/routes/about/icons/logo.svg')],
      routeDir,
    );

    expect(out.assets).toEqual([
      { src: 'icons/logo.svg', file: 'logo-pqr.svg' },
    ]);
  });

  it('у ассета без исходного имени остаётся собранное', () => {
    const out = collectClientOut([asset('font-mno.woff2')], routeDir);

    expect(out.assets).toEqual([
      { src: 'font-mno.woff2', file: 'font-mno.woff2' },
    ]);
  });
});

const config: ConfigH11X = {
  prod: true,
  prefix: '/h11x',
  devPrefix: '/_vite',
  routes: {
    about: {
      mode: 'ssr',
      client: {
        src: '/app/src/routes/about/about.client.tsx',
        out: {
          js: ['about-abc.js'],
          chunks: ['vendor-def.js'],
          css: ['about-ghi.css'],
          assets: [{ src: 'logo.svg', file: 'logo-jkl.svg' }],
        },
      },
      server: {
        src: '/app/src/routes/about/about.ssr.tsx',
        out: '/app/.h11x/ssr/about.js',
      },
    },
  },
};

describe('getAssets', () => {
  it('приклеивает префикс раздачи ко всем путям', () => {
    expect(getAssets({ config }, 'about')).toEqual({
      js: ['/h11x/about-abc.js'],
      chunks: ['/h11x/vendor-def.js'],
      css: ['/h11x/about-ghi.css'],
      assets: [{ src: 'logo.svg', url: '/h11x/logo-jkl.svg' }],
    });
  });
});

describe('createAssetsHtml', () => {
  it('вставляет стили перед скриптами и не трогает остальное', () => {
    const html = createAssetsHtml('/h11x', config.routes.about.client.out);

    expect(html).toBe(
      '<link rel="stylesheet" href="/h11x/about-ghi.css">' +
        '<script type="module" defer src="/h11x/about-abc.js"></script>',
    );
  });
});
