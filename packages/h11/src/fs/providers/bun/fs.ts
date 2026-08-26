import { file as fileBun, write } from 'bun';
import type { FsApi } from '../../../types.ts';
import { mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

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
  checkExist: async (path: string) => {
    const file = fileBun(path);

    return await file.exists();
  },
  mkdir: mkdirBun,
  copyFile: copyFilesBun,
  rm: rmBun,
};
