import { joinPath } from 'h11';
import type { Rollup } from 'vite';
import type { ConfigH11X, RouteClientOut } from './types.ts';
import {
  createCssLinkText,
  createScriptText,
  getDefaultBasedir,
  getEntName,
} from './utils/utils.ts';

const configFile = 'config.json';

export const collectClientOut = (
  output: (Rollup.OutputChunk | Rollup.OutputAsset)[],
): RouteClientOut => {
  const out: RouteClientOut = { js: [], chunks: [], css: [], assets: [] };

  for (const ent of output) {
    if (ent.type === 'chunk') {
      if (ent.isEntry) {
        out.js.push(ent.fileName);
      } else {
        out.chunks.push(ent.fileName);
      }
      continue;
    }

    if (ent.fileName.endsWith('.css')) {
      out.css.push(ent.fileName);
      continue;
    }

    const src = ent.originalFileNames?.[0] ?? ent.names?.[0] ?? ent.fileName;
    out.assets.push({ src: getEntName(src), file: ent.fileName });
  }

  return out;
};

export const writeConfig = async (baseDir: string, config: ConfigH11X) => {
  const configJson = JSON.stringify(config, null, 2);

  await Bun.write(joinPath(baseDir, configFile), configJson);
};

export const readConfig = async (baseDir?: string): Promise<ConfigH11X> => {
  const baseDirPrepared = baseDir ?? getDefaultBasedir();

  const configPath = joinPath(baseDirPrepared, configFile);

  const configJson = await Bun.file(configPath).text();
  const config = JSON.parse(configJson);

  return config;
};

// Весь выход vite-сборки роута с готовыми URL. Нужен странице, которая хочет
// сама вставить preload — имена файлов хешированы, руками их не напишешь.
export const getAssets = (app: { config: ConfigH11X }, name: string) => {
  const { config } = app;
  const { out } = config.routes[name].client;

  const makeUrl = (file: string) => joinPath(config.prefix, file);

  return {
    js: out.js.map(makeUrl),
    chunks: out.chunks.map(makeUrl),
    css: out.css.map(makeUrl),
    assets: out.assets.map(({ src, file }) => ({ src, url: makeUrl(file) })),
  };
};

// Теги для прода: стили роута и его entry-скрипты. Остальное (chunks, шрифты,
// картинки) в HTML не попадает — их подтягивают сам entry и css, а preload
// страница при желании вставляет сама через getAssets.
export const createAssetsHtml = (prefix: string, out: RouteClientOut) => {
  const links = out.css
    .map((file) => createCssLinkText(joinPath(prefix, file)))
    .join('');
  const scripts = out.js
    .map((file) => createScriptText(joinPath(prefix, file)))
    .join('');

  return links + scripts;
};
