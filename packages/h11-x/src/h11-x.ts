import { fsApi } from 'h11-fs';
import { makeSsg } from './ssg.ts';
import { makeSsr } from './ssr.ts';
import type { Route } from './types.ts';
import { getEntName, joinPath } from './utils.ts';

type BuildProps = {
  baseDir?: string;
  routes: string[];
  prod?: boolean;
};

export const buildH11X = async ({
  baseDir,
  prod = true,
  routes,
}: BuildProps) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;

  await fsApi.rm(baseDirPrepared);

  const ssgRoutes: string[] = [];
  const ssrRoutes: string[] = [];

  for (const route of routes) {
    const name = getEntName(route);
    const ssgFile = joinPath(route, `${name}.ssg.ts`);
    const ssrFile = joinPath(route, `${name}.ssr.ts`);
    const clientFile = joinPath(route, `${name}.ssr.ts`);

    const clientFileCheck = await fsApi.checkExist(clientFile);
    if (!clientFileCheck) {
      throw new Error(`No client file ${clientFile}`);
    }

    const ssgFileCheck = await fsApi.checkExist(ssgFile);
    if (ssgFileCheck) {
      ssgRoutes.push(route);
    }

    const ssrFileCheck = await fsApi.checkExist(ssrFile);
    if (ssrFileCheck) {
      ssrRoutes.push(route);
    }
  }

  if (ssgRoutes.length) {
    await makeSsg({ routes: ssgRoutes, prod, baseDir });
  }

  if (ssgRoutes.length) {
    await makeSsr({
      routes: ssrRoutes,
      baseDir,
    });
  }
};

export { makeSsg, makeSsr };
