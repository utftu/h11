import { describe, expect, it } from 'bun:test';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'h11';
import { buildH11X } from '../build/build.ts';
import { createApp } from './app.ts';
import { renderSsr } from '../ssr.tsx';

// Настоящий проект на диске: vite собирает его так же, как у пользователя,
// поэтому тест ловит и раскладку файлов, и пути в разметке. Лежит внутри
// пакета, а не в /tmp: снаружи воркспейса не разрешается импорт h11-x.
const makeProject = async () => {
  const root = `${import.meta.dir}/../../.test-project-${process.pid}`;
  const about = `${root}/src/routes/about`;
  const blog = `${root}/src/routes/blog`;

  await mkdir(about, { recursive: true });
  await mkdir(blog, { recursive: true });

  await writeFile(
    `${about}/about.tsx`,
    `import {Template} from 'h11-x/client';
export const About = ({text}) => <Template><div>{text}</div></Template>;
`,
  );
  await writeFile(
    `${about}/about.ssr.tsx`,
    `import {createPage} from 'h11-x';
import {About} from './about.tsx';
export const page = createPage(About);
`,
  );
  await writeFile(
    `${about}/about.client.tsx`,
    `import './about.css';
import {hydratePage} from 'h11-x/client';
import {About} from './about.tsx';
hydratePage(About);
`,
  );
  await writeFile(`${about}/about.css`, `.hero{color:rebeccapurple}`);

  await writeFile(
    `${blog}/blog.tsx`,
    `import {Template} from 'h11-x/client';
export const Blog = () => <Template><div>blog</div></Template>;
`,
  );
  await writeFile(
    `${blog}/blog.client.tsx`,
    `import {hydratePage} from 'h11-x/client';
import {Blog} from './blog.tsx';
hydratePage(Blog);
`,
  );
  await writeFile(
    `${blog}/blog.ssg.tsx`,
    `import {createPage} from 'h11-x';
import {Blog} from './blog.tsx';
const page = createPage(Blog);
export const pages = [
  {pathname: '/blog', html: page({})},
  {pathname: '/blog/first', html: page({})},
];
`,
  );

  await writeFile(`${root}/.env`, 'PUBLIC_NAME=тест\nSECRET=нет\n');
  await writeFile(`${root}/src/styles.css`, 'body{margin:0}');

  return root;
};

describe('createApp в проде', () => {
  it('собирает роуты, раздаёт статику и рендерит ssr', async () => {
    const root = await makeProject();

    await buildH11X({ root, prod: true });
    const app = await createApp({ root, prod: true });
    const server = Bun.serve({
      port: 0,
      fetch: createServer({ h11: app.h11 }),
    });
    const origin = `http://localhost:${server.port}`;

    // Роуты нашлись автообнаружением, оба режима попали в конфиг.
    expect(Object.keys(app.config.routes).sort()).toEqual(['about', 'blog']);
    expect(app.config.routes.blog.mode).toBe('ssg');

    // Ssg-страницы отдаются поимённо, а не ловушкой на "/**".
    expect((await fetch(`${origin}/blog`)).status).toBe(200);
    expect((await fetch(`${origin}/blog/first`)).status).toBe(200);
    expect((await fetch(`${origin}/nope`)).status).toBe(404);

    // Ssr рендерится на запрос: пропсы доезжают, стили и скрипт вставлены.
    const getHtml = await renderSsr({
      app,
      name: 'about',
      props: { text: 'из пропсов' },
    });
    const html = getHtml();
    const route = app.config.routes.about;

    expect(html).toContain('из пропсов');
    // Корневые стили подхватились по конвенции и идут раньше стилей роута.
    expect(app.config.styles?.src).toBe('src/styles.css');
    expect(html.indexOf(app.config.styles!.out)).toBeLessThan(
      html.indexOf(route!.client.out.css[0]),
    );
    expect(html).toContain('<link rel="stylesheet" href="/h11x/');
    expect(html).toContain('<script type="module" defer src="/h11x/');

    // Только PUBLIC_* уезжает на клиент.
    expect(html).toContain('"PUBLIC_NAME":"тест"');
    expect(html).not.toContain('SECRET');

    // Файлы из разметки реально отдаются, и каталог сборки не открыт с корня.
    const asset = html.split('href="')[1].split('"')[0];
    expect((await fetch(`${origin}${asset}`)).status).toBe(200);
    expect((await fetch(`${origin}/${asset.split('/').at(-1)}`)).status).toBe(
      404,
    );

    await server.stop(true);
    await rm(root, { recursive: true, force: true });
  }, 60_000);
});

describe('перенос собранного', () => {
  it('работает из другого каталога без пересборки', async () => {
    const root = await makeProject();
    const buildDir = `${root}/.h11x`;
    const movedDir = `${root}/.h11x-moved`;

    // Сборочная машина.
    await buildH11X({ root, baseDir: buildDir, prod: true });

    // Деплой: каталог сборки уезжает под другое имя.
    await cp(buildDir, movedDir, { recursive: true });
    await rm(buildDir, { recursive: true, force: true });

    // Боевая машина: ничего не пересобираем.
    const app = await createApp({ root, baseDir: movedDir, prod: true });

    expect(app.vite).toBeUndefined();

    const server = Bun.serve({
      port: 0,
      fetch: createServer({ h11: app.h11 }),
    });
    const origin = `http://localhost:${server.port}`;

    expect((await fetch(`${origin}/blog`)).status).toBe(200);

    const getHtml = await renderSsr({
      app,
      name: 'about',
      props: { text: 'после переезда' },
    });

    expect(getHtml()).toContain('после переезда');

    await server.stop(true);
    await rm(root, { recursive: true, force: true });
  }, 60_000);
});

describe('корневые стили в деве', () => {
  it('приезжают ссылкой до скриптов', async () => {
    const root = await makeProject();

    const app = await createApp({ root, prod: false });
    const getHtml = await renderSsr({ app, name: 'about' });
    const html = getHtml();

    const link =
      '<link rel="stylesheet" href="/_vite/h11x/src/styles.css?direct">';

    expect(html).toContain(link);
    // Модуля с тем же файлом быть не должно: он дал бы вторую загрузку и
    // вторую копию стилей в DOM.
    expect(html).not.toContain(
      '<script type="module" defer src="/_vite/h11x/src/styles.css">',
    );

    // Ссылка раньше любого скрипта — иначе разметка успеет отрисоваться
    // нестилизованной.
    expect(html.indexOf(link)).toBeLessThan(html.indexOf('<script'));

    await app.vite!.close();
    await rm(root, { recursive: true, force: true });
  }, 60_000);
});
