import { defineConfig, build as buildVite } from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile } from './utils.ts';
import type { GetHtmlSsg, Route } from './types.ts';
import { reganVite } from 'regan-vite';
import { relative } from 'node:path';
import { joinPath } from 'h11';

export type Page = {
  pathname: string;
  getHtml: GetHtmlSsg;
};

type GetPages = () => Promise<Page[]>;

const fsApi = await getFsApi();

export const makeSsg = async ({
  routes,
  prod,
  baseDir,
}: {
  routes: Route[];
  prod: boolean;
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();

  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssgFile = await checkFile(dir, `${name}.ssg`, fsApi);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    await buildVite({
      build: {
        outDir: joinPath(baseDirPrepared, 'ssg'),
        lib: {
          entry: ssgFile,
          formats: ['es'],
          fileName: name,
        },
        rollupOptions: {
          external: ['h11-x', 'strangelove'],
        },
        emptyOutDir: false,
      },
      plugins: [reganVite()],
    });

    // client
    const result = await buildVite(
      defineConfig({
        build: {
          rollupOptions: {
            input: clientFile,
            external: ['strangelove'],
            // external: ['h11-x'],
          },
          emptyOutDir: false,
          outDir: baseDirPrepared,
        },
        plugins: [reganVite()],
      })
    );

    if (!('output' in result)) {
      throw new Error('No output in build');
    }
    const buildEnt = result.output[0];

    const clientPreparedFile = relative(
      joinPath(baseDirPrepared, 'assets'),
      `${baseDirPrepared}/${buildEnt.fileName}`
    );

    const jsContent = joinPath(baseDirPrepared, `ssg/${name}.js`);
    const { getPages } = (await import(jsContent)) as {
      getPages: GetPages;
    };

    const pages = await getPages();

    for (const { pathname, getHtml } of pages) {
      const html = await getHtml({ pathname });

      const htmlWithScript = html.replace(
        'H11X_SCRIPT_CLIENT',
        prod ? clientPreparedFile : clientFile
      );

      await fsApi.writeFile(
        joinPath(baseDirPrepared, `assets/${pathname}.html`),
        htmlWithScript
      );
    }
  });

  await Promise.all(routesPromises);
};

// await makeSsg({
//   routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
//   prod: true,
// });
