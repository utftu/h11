import { fsApi } from 'h11-fs';
import { makeSsg } from './ssg.ts';
import { makeSsr, getSsrHtml, readSsrConfig } from './ssr.ts';
import type { Route } from './types.ts';
import { checkFile, getEntName } from './utils.ts';

type BuildProps = {
  baseDir?: string;
  routes: (string | Route)[];
  prod?: boolean;
};

export const makeRouteUniversal = (route: string | Route) => {
  if (typeof route === 'string') {
    return {
      dir: route,
      name: getEntName(route),
    };
  }

  return route;
};

export const buildH11X = async ({
  baseDir,
  prod = true,
  routes,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;

  await fsApi.rm(baseDirPrepared);

  const ssgRoutes: Route[] = [];
  const ssrRoutes: Route[] = [];

  for (const route of routes) {
    const { dir, name } = makeRouteUniversal(route);

    // const name = getEntName(route); checkFile
    const ssgFile = await checkFile(dir, `${name}.ssg`, fsApi);
    // const ssgFile = joinPath(dir, `${name}.ssg.ts`);
    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi);

    // const ssrFile = joinPath(dir, `${name}.ssr.ts`);
    // const clientFile = joinPath(dir, `${name}.ssr.ts`);

    const clientFile = await checkFile(dir, `${name}.client`, fsApi);

    const clientFileCheck = await fsApi.checkExist(clientFile);
    if (!clientFileCheck) {
      throw new Error(`No client file ${clientFile}`);
    }

    const ssgFileCheck = await fsApi.checkExist(ssgFile);
    if (ssgFileCheck) {
      ssgRoutes.push({ dir, name });
    }

    const ssrFileCheck = await fsApi.checkExist(ssrFile);
    if (ssrFileCheck) {
      ssrRoutes.push({ dir, name });
    }
  }

  if (ssgRoutes.length) {
    await makeSsg({ routes: ssgRoutes, prod, baseDir });
  }

  if (ssgRoutes.length) {
    await makeSsr({
      routes: ssrRoutes,
      baseDir,
      prod,
    });
  }
};

export { makeSsg, makeSsr, getSsrHtml, readSsrConfig };
