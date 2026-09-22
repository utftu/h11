import { readdir } from 'node:fs/promises';
import type { Route } from '../types.ts';
import { checkFileOptional, getEntName } from '../utils/utils.ts';

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

// Каталог берётся параметром, а не из cwd: так же зовётся из тестов, и так
// видно, что своего знания о проекте у обхода нет.
export const getRoutes = async (rootDir: string): Promise<Route[]> => {
  const dirs = await readDirs(rootDir);
  const routes = await Promise.all(
    dirs.map((entName) => walkRoutesDir(`${rootDir}/${entName}`, entName)),
  );

  return routes.flat();
};

// Роуты живут в src/routes корня проекта — того самого root, откуда читается
// .env, а не рабочего каталога процесса.
export const getProjectRoutes = async (root: string): Promise<Route[]> => {
  return getRoutes(`${root}/src/routes`);
};
