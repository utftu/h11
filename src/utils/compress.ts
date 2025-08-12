import { fsApi } from '../fs-api/fs-universal.ts';
import { readdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import {
  createGzip,
  createDeflate,
  createBrotliCompress,
  type BrotliOptions,
  type ZlibOptions,
} from 'node:zlib';

const formats = {
  gzip: 'gz',
  deflate: 'defalte',
  brotli: 'br',
} as const;

type Format = keyof typeof formats;

const allowedCompressFormats = Object.keys(formats) as Format[];

/**
 * Gzip
 */
export async function gzipFile(
  inputPath: string,
  outputPath: string,
  options?: ZlibOptions
): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createGzip(options),
    createWriteStream(outputPath)
  );
}

/**
 * Deflate
 */
export async function deflateFile(
  inputPath: string,
  outputPath: string,
  options?: ZlibOptions
): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createDeflate(options),
    createWriteStream(outputPath)
  );
}

/**
 * Brotli
 */
export async function brotliFile(
  inputPath: string,
  outputPath: string,
  options?: BrotliOptions
): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createBrotliCompress(options),
    createWriteStream(outputPath)
  );
}

// const compressNative = async (path: string, type: Formats) => {
//   const rs = fsApi.getFileStream(path);
//   const gz = new CompressionStream(type);

//   const compressed = rs.pipeThrough(gz);
//   await fsApi.writeFileStream(`${path}.${formats[type]}`, compressed);
// };

const compress = async (path: string, format: Format) => {
  if (format === 'brotli') {
    await brotliFile(path, `${path}.br`);
  } else if (format === 'deflate') {
    await deflateFile(path, `${path}.deflate`);
  } else if (format === 'gzip') {
    await gzipFile(path, `${path}.gz`);
  }

  throw new Error('Unknow compress format');
};

const recComporess = async (pathToDir: string) => {
  const ents = await readdir(pathToDir, { withFileTypes: true });

  for (const ent of ents) {
    if (ent.isFile()) {
      const pathToFile = `${pathToDir}/${ent.name}`;
      for (const format of allowedCompressFormats) {
        await compress(pathToFile, format);
        // if (format === 'brotli') {
        //   await brotliFile(pathToFile, `${pathToFile}.br`);
        // }
      }
      continue;
    }
    if (ent.isDirectory()) {
      recComporess(`${pathToDir}/${ent.name}`);
    }
  }
};

await recComporess('./dist');

// const rec = (pathToDir: string, a: () => Promise<void>) => {};
// const files = await readdir('.', { withFileTypes: true });

// console.log('-----', 'files', files);
