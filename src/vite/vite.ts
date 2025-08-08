import { readFile } from 'node:fs/promises';
import { type ViteDevServer } from 'vite';

export const HTML_INSERT_PLACE = '<!--ssr-place-h11-->';

type Render = (req: Request) => string;

const a = async ({
  pathToHtml,
  pathToJs,
  vite,
  url,
}: {
  pathToHtml: string;
  pathToJs: string;
  vite: ViteDevServer;
  url: string;
}) => {
  // const file = Bun.file('./index.html');
  // const text = await file.text();
  const fileText = await readFile(pathToHtml, { encoding: 'utf-8' });
  const template = await vite.transformIndexHtml(url, fileText);
  // ????
  const { render } = await vite.ssrLoadModule(pathToJs);
  const appHtml = await render();
  const html = template.replace(`<!--ssr-outlet-->`, () => appHtml);
};
