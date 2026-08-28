import type { FsApi } from '../../../types.ts';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir,
  copyFile,
  rm,
  writeFile,
  access,
  readdir,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const readdirNode = async (path: string) => {
  const ents = await readdir(path, { withFileTypes: true });

  return ents.map((ent) => ({
    name: ent.name,
    directory: ent.isDirectory(),
  }));
};

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
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  mkdir: mkdirNode,
  copyFile,
  rm: rmNode,
  readdir: readdirNode,
};
