import type { FsApi } from 'h11';

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

export const getFsApi = async () => {
  const runtime = getRuntime();

  if (runtime === 'bun') {
    return (await import('../../h11-bun')).fsApiBun as unknown as FsApi;
    // // @ts-ignore
    // return (await import('../../h11-bun')).fsApiBun;
  } else if (runtime === 'node') {
    return (await import('../../h11-node')).fsApiNode as unknown as FsApi;
    // // @ts-ignore
    // return (await import('../../h11-node')).fsApiNode;
  }

  throw new Error('Unknown runtime');
};

export const fsApi = await getFsApi();
