import { getInit, createServer } from 'h11';
import { getAbsolutePath } from 'utftu';
import { createApp, renderSsr } from 'h11-x';

// root не передан, значит берётся cwd — запускать пример надо из его
// каталога. Оттуда же читается .env и туда кладётся .h11x.
const app = await createApp({
  routes: [
    getAbsolutePath('./routes/about', import.meta),
    getAbsolutePath('./routes/blog', import.meta),
  ],
  prod: false,
});

app.h11.get('/about', async () => {
  const getHtml = await renderSsr({ app, name: 'about' });
  const html = getHtml();
  return new Response(html, getInit('html'));
});

// createServer отдаёт пару для Bun.serve: fetch и таблицу вебсокетов. Вторая
// нужна и в этом примере — через неё идёт HMR-канал dev-сервера vite.
Bun.serve({
  port: 3000,
  ...createServer({ h11: app.h11 }),
});
