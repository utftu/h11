import { fsApi } from '../fs-universal.ts';
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
  deflate: 'deflate',
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
  // console.log('-----', 'format', format);
  if (format === 'brotli') {
    await brotliFile(path, `${path}.br`);
    return;
  } else if (format === 'deflate') {
    await deflateFile(path, `${path}.deflate`);
    return;
  } else if (format === 'gzip') {
    await gzipFile(path, `${path}.gz`);
    return;
  }

  throw new Error('Unknow compress format');
};

const recComporess = async (pathToDir: string) => {
  const ents = await readdir(pathToDir, { withFileTypes: true });
  // console.log('-----', 'ents', [...ents]);

  file_for: for (const ent of ents) {
    if (ent.isFile()) {
      console.log('-----', 'file', ent.name);
      for (const allowedCompressFormat of allowedCompressFormats) {
        console.log(
          '-----',
          '`.${formats[allowedCompressFormat]}`',
          `.${formats[allowedCompressFormat]}`
        );
        if (ent.name.endsWith(`.${formats[allowedCompressFormat]}`)) {
          continue file_for;
        }
      }
      console.log('after');

      const pathToFile = `${pathToDir}/${ent.name}`;
      for (const format of allowedCompressFormats) {
        await compress(pathToFile, format);
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
