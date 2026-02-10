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

const compress = async (path: string, format: Format) => {
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

export const compressRecirsive = async (pathToDir: string) => {
  const ents = await readdir(pathToDir, { withFileTypes: true });

  file_for: for (const ent of ents) {
    if (ent.isFile()) {
      if (ent.name.endsWith('.html')) {
        continue file_for;
      }

      for (const allowedCompressFormat of allowedCompressFormats) {
        if (ent.name.endsWith(`.${formats[allowedCompressFormat]}`)) {
          continue file_for;
        }
      }

      const pathToFile = `${pathToDir}/${ent.name}`;
      for (const format of allowedCompressFormats) {
        await compress(pathToFile, format);
      }
      continue;
    }
    if (ent.isDirectory()) {
      await compressRecirsive(`${pathToDir}/${ent.name}`);
    }
  }
};

// await recComporess('./dist');
