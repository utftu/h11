import { file as fileBun, write } from 'bun';
import { type FsApi } from 'h11';
import { copyFiles, mkdirNode, rmNode } from '../../h11-node/src/fs.node.ts';

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
