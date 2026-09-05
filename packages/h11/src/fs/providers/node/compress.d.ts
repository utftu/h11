import { type BrotliOptions, type ZlibOptions } from 'node:zlib';
/**
 * Gzip
 */
export declare function gzipFile(inputPath: string, outputPath: string, options?: ZlibOptions): Promise<void>;
/**
 * Deflate
 */
export declare function deflateFile(inputPath: string, outputPath: string, options?: ZlibOptions): Promise<void>;
/**
 * Brotli
 */
export declare function brotliFile(inputPath: string, outputPath: string, options?: BrotliOptions): Promise<void>;
export declare const compressRecursive: (pathToDir: string) => Promise<void>;
