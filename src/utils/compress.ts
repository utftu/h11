import { fsApi } from '../fs-api/fs-universal.ts';
import { readdir } from 'node:fs/promises';

const formats = {
  gzip: 'gz',
  deflate: 'zz',
} as const;

const allowedCompressFormats = Object.keys(formats) as (keyof typeof formats)[];

const compressNative = async (path: string, type: 'gzip' | 'deflate') => {
  const rs = fsApi.getFileStream(path);
  const gz = new CompressionStream(type);

  const compressed = rs.pipeThrough(gz);
  await fsApi.writeFileStream(`${path}.${formats[type]}`, compressed);
};

const recComporess = async (pathToDir: string) => {
  const ents = await readdir(pathToDir, { withFileTypes: true });

  for (const ent of ents) {
    if (ent.isFile()) {
      const pathToFile = `${pathToDir}/${ent.name}`;
      for (const format of allowedCompressFormats) {
        await compressNative(pathToFile, format);
      }
      continue;
    }
    if (ent.isDirectory()) {
      recComporess(`${pathToDir}/${ent.name}`);
    }
  }
};

// const rec = (pathToDir: string, a: () => Promise<void>) => {};
// const files = await readdir('.', { withFileTypes: true });

// console.log('-----', 'files', files);
