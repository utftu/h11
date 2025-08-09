import { createReadStream } from 'node:fs';
import { mkdir, copyFile, exists, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import type { FsApi } from './fs-api.ts';

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

export const fsApiNode: FsApi = {
  getFileStream: (path: string) => {
    const file = createReadStream(path);

    return Readable.toWeb(file) as any as ReadableStream;
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
