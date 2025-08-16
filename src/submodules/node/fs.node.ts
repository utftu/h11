import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, copyFile, exists, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { FsApi } from '../fs/fs.types.ts';

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
  async writeFileStream(path, stream) {
    const nodeReadable = Readable.fromWeb(stream as any);
    const file = createWriteStream(path);
    await pipeline(nodeReadable, file); // дождётся 'finish' и пробросит ошибки
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
