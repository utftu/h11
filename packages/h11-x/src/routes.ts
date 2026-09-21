import { readdir } from 'node:fs/promises';
import { cwd } from 'node:process';
import type { Route } from './types.ts';
import { checkFileOptional, getEntName } from './utils.ts';

export const getDefaultRoutesDir = () => {
  return `${cwd()}/src/routes`;
};

// Роутом считается директория, где есть файл по конвенции
// <имя-папки>.client.{ts,tsx}, .ssr.{ts,tsx} или .ssg.{ts,tsx} — имя роута при
// этом путь от src/routes через '/', а не только имя листовой папки, чтобы
// src/routes/blog/aleksei/aleksei.ssr.tsx стал роутом "blog/aleksei", а не
// просто "aleksei". Директории без такого файла не роут сами по себе (в них
// может лежать что-то общее вроде _shared) — спускаемся в их поддиректории.
const readDirs = async (dir: string) => {
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);

  return ents.filter((ent) => ent.isDirectory()).map((ent) => ent.name);
};

const walkRoutesDir = async (dir: string, name: string): Promise<Route[]> => {
  const dirName = getEntName(dir);
  const [client, ssr, ssg] = await Promise.all([
    checkFileOptional(dir, `${dirName}.client`),
    checkFileOptional(dir, `${dirName}.ssr`),
    checkFileOptional(dir, `${dirName}.ssg`),
  ]);

  if (client || ssr || ssg) {
    return [{ dir, name }];
  }

  const dirs = await readDirs(dir);
  const nested = await Promise.all(
    dirs.map((entName) =>
      walkRoutesDir(`${dir}/${entName}`, `${name}/${entName}`),
    ),
  );

  return nested.flat();
};

export const getDefaultRoutes = async (): Promise<Route[]> => {
  const rootDir = getDefaultRoutesDir();

  const dirs = await readDirs(rootDir);
  const routes = await Promise.all(
    dirs.map((entName) => walkRoutesDir(`${rootDir}/${entName}`, entName)),
  );

  return routes.flat();
};
