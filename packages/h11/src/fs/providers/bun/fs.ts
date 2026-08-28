import { file as fileBun, write } from 'bun';
import type { FsApi } from '../../../types.ts';
import { mkdir, copyFile, rm, readdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';

const checkExistBun = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const readdirBun = async (path: string) => {
  const ents = await readdir(path, { withFileTypes: true });

  return ents.map((ent) => ({
    name: ent.name,
    directory: ent.isDirectory(),
  }));
};

const mkdirBun = async (path: string) => {
  await mkdir(path, { recursive: true });
};

const rmBun = async (path: string) => {
  await rm(path, { recursive: true, force: true });
};

const copyFilesBun = async (from: string, to: string) => {
  const destDir = dirname(to);
  await mkdir(destDir, { recursive: true });
  await copyFile(from, to);
};

export const fsApiBun: FsApi = {
  getFileStream: (path: string) => {
    const file = fileBun(path);

    return file.stream();
  },
  async writeFileStream(path: string, stream: ReadableStream) {
    await Bun.write(path, new Response(stream));
  },
  writeFile: async (path: string, text: string) => {
    await write(path, text);
  },
  checkExist: checkExistBun,
  mkdir: mkdirBun,
  copyFile: copyFilesBun,
  rm: rmBun,
  readdir: readdirBun,
};
