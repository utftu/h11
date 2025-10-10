import { defineConfig, build as buildVite } from 'vite';
import { getFsApi } from 'h11-fs';
import { checkFile, getEntName, joinPath } from './utils.ts';
import type { GetHtmlSsg, SsgRoute } from './types.ts';
import { reganVite } from 'regan-vite';
import { relative } from 'node:path';

// const getFullPath = (base: string, path: string) => {
//   if (path[0] === '/') {
//     return path;
//   }

//   return join(base, path);
// };

export type Page = {
  pathname: string;
  getHtml: GetHtmlSsg;
};

type GetPages = () => Promise<Page[]>;

const fsApi = await getFsApi();

// type SsgRouteFull = SsgRoute & { ssgFile: string; clientFile: string };

export const makeSsg = async ({
  routes,
  prod,
  baseDir,
}: {
  routes: SsgRoute[];
  prod: boolean;
  baseDir?: string;
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  const h11xDir = joinPath(baseDirPrepared, '.h11x');
  const assetsDir = joinPath(h11xDir, 'assets');

  const routesPromises = routes.map(async ({ dir, name }) => {
    const entName = getEntName(dir);

    const ssgFile = await checkFile(dir, `${entName}.ssg`, fsApi);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi);

    // client
    const result = await buildVite(
      defineConfig({
        build: {
          rollupOptions: {
            input: clientFile,
          },
          emptyOutDir: false,
          outDir: h11xDir,
        },
        plugins: [reganVite()],
      })
    );

    if (!('output' in result)) {
      throw new Error('No output in build');
    }
    const buildEnt = result.output[0];

    console.log('-----', '1', assetsDir);
    console.log('-----', '2', `${assetsDir}/${buildEnt.fileName}`);
    console.log('-----', 'buildEnt.fileName', buildEnt.fileName);
    const clientPreparedFile = relative(
      assetsDir,
      `${h11xDir}/${buildEnt.fileName}`
    );

    // const clientPreparedFile = `${outdir}/${buildEnt.fileName}`;

    await buildVite({
      build: {
        outDir: joinPath(h11xDir, 'ssg'),
        lib: {
          entry: ssgFile,
          formats: ['es'],
          fileName: name,
        },
        emptyOutDir: false,
      },
      plugins: [reganVite()],
    });

    const jsContent = joinPath(h11xDir, `ssg/${name}.js`);
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
        joinPath(h11xDir, `assets/${pathname}.html`),
        htmlWithScript
      );
    }
  });

  await Promise.all(routesPromises);
};

await makeSsg({
  routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
  prod: true,
});
