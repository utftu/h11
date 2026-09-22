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

  // Css лежит не только рядом с клиентским входом, но и в общем компоненте:
  // так его находит только обход графа, а не взгляд на сам вход.
  await writeFile(
    `${about}/about.tsx`,
    `import './hero.css';
import {Template} from 'h11-x/client';
export const About = ({text}) => <Template><div class="hero">{text}</div></Template>;
`,
  );
  await writeFile(`${about}/hero.css`, `.hero{font-weight:700}`);
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

// События сокета приходят не на ответ запроса, поэтому их ждут.
const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 150; i++) {
    if (check()) {
      return true;
    }
    await Bun.sleep(20);
  }

  return false;
};

describe('createApp в проде', () => {
  it('собирает роуты, раздаёт статику и рендерит ssr', async () => {
    const root = await makeProject();

    // Корень vite у каждой сборки — корень проекта, а не рабочий каталог
    // процесса: от него плагины вроде tailwind ищут контент.
    const viteRoots: string[] = [];

    await buildH11X({
      root,
      prod: true,
      editViteConfig: (_, config) => {
        viteRoots.push(config.root as string);
        return config;
      },
    });
    const app = await createApp({ root, prod: true });

    expect(viteRoots.length).toBeGreaterThan(0);
    expect([...new Set(viteRoots)]).toEqual([root]);
    const server = Bun.serve({
      port: 0,
      ...createServer({ h11: app.h11 }),
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
      ...createServer({ h11: app.h11 }),
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

describe('стили в деве', () => {
  it('приезжают ссылками до скриптов', async () => {
    const root = await makeProject();

    const app = await createApp({ root, prod: false });
    const getHtml = await renderSsr({ app, name: 'about' });
    const html = getHtml();

    const prefix = '/_vite/h11x/src';
    const rootLink = `<link rel="stylesheet" href="${prefix}/styles.css?direct">`;
    // Импортируется прямо клиентским входом.
    const routeLink = `<link rel="stylesheet" href="${prefix}/routes/about/about.css?direct">`;
    // А этот — общим компонентом, то есть на шаг глубже.
    const deepLink = `<link rel="stylesheet" href="${prefix}/routes/about/hero.css?direct">`;

    expect(html).toContain(rootLink);
    expect(html).toContain(routeLink);
    expect(html).toContain(deepLink);

    // Модуля с корневым файлом быть не должно: он дал бы вторую загрузку и
    // вторую копию стилей в DOM.
    expect(html).not.toContain(
      `<script type="module" defer src="${prefix}/styles.css">`,
    );

    // Корневые стили раньше стилей роута — как и в проде, чтобы страница
    // перебивала общее. И всё это раньше любого скрипта, иначе разметка
    // успеет отрисоваться нестилизованной.
    expect(html.indexOf(rootLink)).toBeLessThan(html.indexOf(routeLink));
    // Порядок ссылок повторяет порядок импортов — ради этого обход идёт
    // последовательно.
    expect(html.indexOf(routeLink)).toBeLessThan(html.indexOf(deepLink));

    // Порт ws-канала в клиента не зашит: браузер пойдёт на тот же origin, с
    // которого взял страницу. Иначе за https и обратным прокси канал не
    // встанет вовсе.
    const viteClient = await app.vite!.transformRequest('/@vite/client');
    expect(viteClient?.code).toContain('const hmrPort = null');
    expect(html.indexOf(routeLink)).toBeLessThan(html.indexOf('<script'));
    expect(html.indexOf(deepLink)).toBeLessThan(html.indexOf('<script'));

    await app.close();
    await rm(root, { recursive: true, force: true });
  }, 60_000);
});

describe('HMR-канал в деве', () => {
  it('идёт через наш origin и доносит события до браузера', async () => {
    const root = await makeProject();

    const app = await createApp({ root, prod: false });
    const server = Bun.serve({
      port: 0,
      ...createServer({ h11: app.h11 }),
    });
    const origin = `http://localhost:${server.port}`;

    // Браузер сперва забирает css по ссылке из разметки. Без этого vite про
    // файл не знает и на правку ответит полной перезагрузкой, а не заменой
    // стилей.
    const css = await fetch(
      `${origin}/_vite/h11x/src/routes/about/about.css?direct`,
    );
    expect(css.status).toBe(200);

    // Ровно то, что делает клиент vite: тот же адрес, что у страницы, путь —
    // base со слэшем на конце, подпротокол vite-hmr. Обрыв тоже повторяем за
    // ним — настоящий клиент на закрытие переподключается, и без этого тест
    // строже реальности.
    const connect = async () => {
      const ws = new WebSocket(
        `${origin.replace('http', 'ws')}/_vite/h11x/`,
        'vite-hmr',
      );
      const got: string[] = [];
      ws.onmessage = (event) => got.push(String(event.data));

      // Рукопожатие делает сам vite на своём локальном хосте, поэтому первым
      // приходит его connected.
      expect(await waitFor(() => got.length > 0)).toBe(true);
      expect(got[0]).toContain('connected');

      // Правка файла обязана доехать до сокета — ради этого всё и делалось.
      await writeFile(
        `${root}/src/routes/about/about.css`,
        `.hero{color:red}/* ${Date.now()} */`,
      );
      await waitFor(() => got.length > 1 || ws.readyState !== WebSocket.OPEN);

      return { ws, got };
    };

    let { ws, got } = await connect();
    if (!got.join(' ').includes('css-update')) {
      ({ ws, got } = await connect());
    }

    expect(got.join(' ')).toContain('css-update');

    ws.close();
    await app.close();
    // Ограниченно: Bun изредка не отпускает сокет, чья дальняя половина
    // оборвалась аварийно, и тогда stop(true) не дожидается никогда. На
    // проверки это не влияет — они все выше, — а тест из-за этого висел.
    await Promise.race([server.stop(true), Bun.sleep(2000)]);
    await rm(root, { recursive: true, force: true });
  }, 60_000);
});
