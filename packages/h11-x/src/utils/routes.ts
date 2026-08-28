import type { FsApi } from 'h11';
import { cwd } from 'node:process';
import type { Route } from '../types.ts';
import { checkFileOptional, getEntName } from './utils.ts';

export const getDefaultRoutesDir = () => {
  return `${cwd()}/src/routes`;
};

// Роутом считается директория, где есть файл по конвенции
// <имя-папки>.client.{ts,tsx} или <имя-папки>.ssr.{ts,tsx} — имя роута при
// этом путь от src/routes через '/', а не только имя листовой папки, чтобы
// src/routes/blog/aleksei/aleksei.ssr.tsx стал роутом "blog/aleksei", а не
// просто "aleksei". Директории без такого файла не роут сами по себе (в них
// может лежать что-то общее вроде _shared) — спускаемся в их поддиректории.
const walkRoutesDir = async (
  dir: string,
  name: string,
  fsApi: FsApi
): Promise<Route[]> => {
  const dirName = getEntName(dir);
  const [client, ssr] = await Promise.all([
    checkFileOptional(dir, `${dirName}.client`, fsApi),
    checkFileOptional(dir, `${dirName}.ssr`, fsApi),
  ]);

  if (client || ssr) {
    return [{ dir, name }];
  }

  const ents = await fsApi.readdir(dir);
  const nested = await Promise.all(
    ents
      .filter((ent) => ent.directory)
      .map((ent) =>
        walkRoutesDir(`${dir}/${ent.name}`, `${name}/${ent.name}`, fsApi)
      )
  );

  return nested.flat();
};

export const getDefaultRoutes = async (fsApi: FsApi): Promise<Route[]> => {
  const rootDir = getDefaultRoutesDir();

  const exists = await fsApi.checkExist(rootDir);
  if (!exists) return [];

  const ents = await fsApi.readdir(rootDir);
  const routes = await Promise.all(
    ents
      .filter((ent) => ent.directory)
      .map((ent) => walkRoutesDir(`${rootDir}/${ent.name}`, ent.name, fsApi))
  );

  return routes.flat();
};
