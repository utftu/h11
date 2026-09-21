import { defineConfig, build as buildVite, type Rollup } from 'vite';
import { joinPath } from 'h11';
import { defu } from 'defu';
import { viteConfigBaseClient, viteConfigBaseServer } from './config.ts';
import { collectClientOut } from './route-config.ts';
import type { EditViteConfig, RouteClientOut } from './types.ts';

// Серверный модуль роута: ssr-страница или ssg-список страниц. Собирается как
// библиотека (один вход — один файл), потому что импортировать его будем мы
// сами, а не браузер. Возвращается путь к собранному файлу — его же кладём в
// config.json как server.out.
export const buildServer = async ({
  entry,
  outDir,
  name,
  editViteConfig,
}: {
  entry: string;
  outDir: string;
  name: string;
  editViteConfig: EditViteConfig;
}) => {
  const config = defineConfig({
    build: {
      outDir,
      lib: {
        entry,
        formats: ['es'],
        fileName: name,
      },
    },
  });

  let configFinal = defu(config, viteConfigBaseServer);
  configFinal = editViteConfig('ssr_server', configFinal);

  await buildVite(configFinal);

  return joinPath(outDir, `${name}.js`);
};

// Клиентская сборка роута. Каталог сборки — тот же, что отдаёт serveFiles,
// assetsDir пустой, base равен префиксу раздачи: тогда URL файла это префикс
// плюс его имя, и ровно тот же URL vite зашивает внутрь css и динамических
// импортов. Возвращается разбор всего, что выдала сборка.
export const buildClient = async ({
  entry,
  baseDir,
  prefix,
  editViteConfig,
}: {
  entry: string;
  baseDir: string;
  prefix: string;
  editViteConfig: EditViteConfig;
}): Promise<RouteClientOut> => {
  const config = defineConfig({
    base: `${prefix}/`,
    build: {
      rollupOptions: {
        input: entry,
      },
      outDir: joinPath(baseDir, 'assets'),
      assetsDir: '',
    },
  });

  let configFinal = defu(config, viteConfigBaseClient);
  configFinal = editViteConfig('ssr_client', configFinal);

  const result = (await buildVite(configFinal)) as Rollup.RollupOutput;

  return collectClientOut(result.output);
};
