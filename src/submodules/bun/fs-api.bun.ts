import type { FsApi } from '../fs/fs-api.ts';
import { file as fileBun, write } from 'bun';
import { copyFiles, mkdirNode, rmNode } from '../node/fs-api.node.ts';

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
  mkdir: mkdirNode,
  copyFile: copyFiles,
  rm: rmNode,
};
