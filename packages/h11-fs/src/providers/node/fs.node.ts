import type { FsApi } from 'h11';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, copyFile, exists, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const copyFiles = async (from: string, to: string) => {
  const destDir = dirname(to);
  await mkdir(destDir, { recursive: true });
  await copyFile(from, to);
};

export const mkdirNode = async (path: string) => {
  await mkdir(path, { recursive: true });
};

export const rmNode = async (path: string) => {
  await rm(path, { recursive: true, force: true });
};

export const fsApiNode: FsApi = {
  getFileStream: (path: string) => {
    const file = createReadStream(path);

    return Readable.toWeb(file) as any as ReadableStream;
  },
  async writeFileStream(path, stream) {
    const nodeReadable = Readable.fromWeb(stream as any);
    const file = createWriteStream(path);
    await pipeline(nodeReadable, file);
  },
  writeFile: async (path: string, text: string) => {
    await writeFile(path, text);
  },
  checkExist: async (path: string) => {
    return exists(path);
  },
  mkdir: mkdirNode,
  copyFile,
  rm: rmNode,
};
