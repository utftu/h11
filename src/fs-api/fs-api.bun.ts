import { copyFiles, mkdirNode, rmNode } from './fs-api.node.ts';
import { file as fileBun, write } from 'bun';
import type { FsApi } from './fs-api.ts';

export const fsApiBun: FsApi = {
  getFileStream: (path: string) => {
    const file = fileBun(path);

    return file.stream();
  },
  writeFile: async (path: string, text: string) => {
    await write(path, text);
  },
  checkExist: async (path: string) => {
    const file = fileBun(path);

    return await file.exists();
  },
  mkdir: mkdirNode,
  copyFile: copyFiles,
  rm: rmNode,
};
