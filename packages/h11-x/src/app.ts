import { H11, joinPath } from 'h11';
import { serveFiles } from 'h11-fs';
import { createConnectAdapter } from 'h11-fs/node';
import {
  createServer as createViteServer,
  type ViteDevServer,
  type UserConfig,
} from 'vite';
import { reganVite } from 'regan-vite';
import { buildH11X, prefix as defaultPrefix } from './h11-x.ts';
import { readSsrConfig, type ConfigSsr } from './ssr.tsx';
import type { EditViteConfig, Route } from './types.ts';
import { loadEnvFile } from './env.ts';

// Where vite's own dev middleware is mounted, before `prefix` is nested in
// front of it. Matches buildH11X's internal default — see getSsrHtml, which
// reconstructs the same `joinPath(devPrefix, prefix)` from ConfigSsr.
const defaultDevPrefix = '/_vite';

export type H11XApp = {
  h11: H11;
  vite?: ViteDevServer;
  ssrConfig: ConfigSsr;
};

export const createH11XApp = async ({
  baseDir,
  routes,
  prod = true,
  prefix = defaultPrefix,
  devPrefix = defaultDevPrefix,
  editViteConfig = (_, config) => config,
  viteConfig,
  h11,
}: {
  baseDir?: string;
  routes: (string | Route)[];
  prod?: boolean;
  prefix?: string;
  devPrefix?: string;
  editViteConfig?: EditViteConfig;
  viteConfig?: UserConfig;
  h11?: H11;
}): Promise<H11XApp> => {
  const projectRoot = baseDir || process.cwd();
  const baseDirPrepared = baseDir || `${projectRoot}/.h11x`;

  await loadEnvFile(`${projectRoot}/.env`);
  const devPrefixFull = joinPath(devPrefix, prefix);

  let vite: ViteDevServer | undefined;
  if (!prod) {
    vite = await createViteServer({
      ...viteConfig,
      plugins: [reganVite(), ...(viteConfig?.plugins ?? [])],
      base: devPrefixFull,
      server: { ...viteConfig?.server, middlewareMode: true },
      // h11-x — уже собранный пакет, а не исходники под HMR: пусть
      // ssrLoadModule требует его напрямую через Node, а не пытается
      // прогнать через свой трансформ/анализ импортов.
      ssr: { external: ['h11-x'], ...viteConfig?.ssr },
    });
  }

  await buildH11X({
    baseDir: baseDirPrepared,
    prod,
    routes,
    prefix,
    devPrefix,
    editViteConfig,
  });

  const ssrConfig = await readSsrConfig(baseDirPrepared);

  const h11Internal = h11 || new H11();

  if (!prod && vite) {
    // Registered as middleware (`.use()`), not `.get(..., '/**')`: `.get()`
    // wildcards are scoped to GET only (`node.wilds['GET']`), while vite's
    // dev middleware also needs to handle other methods (HMR, sourcemaps,
    // etc). `.use()` middlewares run for every method regardless.
    h11Internal.use(
      devPrefixFull,
      createConnectAdapter({
        prefixToRemove: devPrefixFull,
        connectMiddleware: vite.middlewares,
      }),
    );
  }

  h11Internal.get(
    `${prefix}/**`,
    serveFiles({ dir: `${baseDirPrepared}/assets`, prefix: `${prefix}/` }),
  );
  h11Internal.get(
    '/**',
    serveFiles({ dir: `${baseDirPrepared}/assets`, prefix: '' }),
  );

  return { h11: h11Internal, vite, ssrConfig };
};
