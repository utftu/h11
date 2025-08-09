import { fsUniversalBun } from './fs-universal.bun.ts';
import { fsUniversalNode } from './fs-universal.node.ts';

export type FileApi = {
  getFileStream: (path: string) => ReadableStream;
  checkExist: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (from: string, to: string) => Promise<void>;
  rm: (path: string) => Promise<void>;
};

export function getRuntime() {
  if (typeof Bun !== 'undefined') return 'bun';

  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  // @ts-ignore
  if (typeof Deno !== 'undefined') return 'deno';
  // @ts-ignore
  if (typeof EdgeRuntime !== 'undefined') return 'vercel-edge';
  // @ts-ignore
  if (typeof WebSocketPair !== 'undefined') return 'cloudflare-worker';
  if (typeof process !== 'undefined') {
    if (process.env.AWS_EXECUTION_ENV) return 'aws-lambda';
    if (process.env.NETLIFY) return 'netlify';
  }
  if (typeof window !== 'undefined') return 'browser';
  // @ts-ignore
  if (typeof self !== 'undefined' && typeof self.skipWaiting === 'function')
    return 'service-worker';
  return 'unknown';
}

export const getFsApi = () => {
  const runtime = getRuntime();

  if (runtime === 'bun') {
    return fsUniversalBun;
  } else if (runtime === 'node') {
    return fsUniversalNode;
  }

  throw new Error('Unknown');
};
