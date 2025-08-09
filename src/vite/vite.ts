// import { readFile } from 'node:fs/promises';
import { type ViteDevServer } from 'vite';
import { getFsApi } from '../fs-api/fs-universal.ts';
import { getText } from '../utils/stream.ts';

export const createHtml = ({
  bodyApp,
  title,
  pathToJs,
  lang = 'en',
}: {
  pathToJs: string;
  bodyApp: string;
  title: string;
  lang: string;
}) => `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app">${bodyApp}</div>
    ${pathToJs ? '<script type="module" src="${pathToJs}">' : ''}
  </body>
</html>`;

export const HTML_BODY_APP = '<!--ssr-h11-app-->';
export const HTML_BODY_LOAD_JS = '<!--ssr-h11-loadjs-->';

// type Render = (req: Request) => string;

const fsApi = getFsApi();

class HtmlTemplae {
  html: string;
  constructor(html: string) {
    this.html = html;
  }
}

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
  const stream = getFsApi().getFileStream(pathToHtml);
  const fileText = await getText(stream);
  // const fileText = await readFile(pathToHtml, { encoding: 'utf-8' });
  const template = await vite.transformIndexHtml(url, fileText);
  // ????
  const { render } = await vite.ssrLoadModule(pathToJs);
  const appHtml = await render();
  const html = template.replace(`<!--ssr-outlet-->`, () => appHtml);
};
