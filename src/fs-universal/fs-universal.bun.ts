import type { FileApi } from './fs-universal.ts';
import { copyFiles, mkdirNode, rmNode } from './fs-universal.node.ts';

export const fsUniversalBun: FileApi = {
  getFileStream: (path: string) => {
    const file = Bun.file(path);

    return file.stream();
  },
  checkExist: async (path: string) => {
    const file = Bun.file(path);

    return await file.exists();
  },
  mkdir: mkdirNode,
  copyFile: copyFiles,
  rm: rmNode,
};
