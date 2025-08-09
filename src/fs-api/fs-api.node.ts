import { createReadStream } from 'node:fs';
import type { FileApi } from './fs-universal.ts';
import { mkdir, copyFile, exists, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';

export const copyFiles = async (from: string, to: string) => {
  const destDir = dirname(from);
  await mkdir(destDir, { recursive: true }); // создаёт все недостающие директории
  await copyFile(from, to); // копирует файл
};

export const mkdirNode = async (path: string) => {
  await mkdir(path, { recursive: true });
};

export const rmNode = async (path: string) => {
  await rm(path, { recursive: true, force: true });
};

export const fsApiNode: FileApi = {
  getFileStream: (path: string) => {
    const file = createReadStream(path);

    return Readable.toWeb(file) as any as ReadableStream;
  },
  checkExist: async (path: string) => {
    return exists(path);
  },
  mkdir: mkdirNode,
  copyFile,
  rm: rmNode,
};
