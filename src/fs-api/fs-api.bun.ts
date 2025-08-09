import type { FileApi } from './fs-universal.ts';
import { copyFiles, mkdirNode, rmNode } from './fs-api.node.ts';
import { file as fileBun } from 'bun';

export const fsApiBun: FileApi = {
  getFileStream: (path: string) => {
    const file = fileBun(path);

    return file.stream();
  },
  checkExist: async (path: string) => {
    const file = fileBun(path);

    return await file.exists();
  },
  mkdir: mkdirNode,
  copyFile: copyFiles,
  rm: rmNode,
};
