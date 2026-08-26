export function getRuntime() {
  if (typeof Bun !== 'undefined') return 'bun';

  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  return 'unknown';
}

export const getFsApi = async () => {
  const runtime = getRuntime();

  if (runtime === 'bun') {
    return (await import('./providers/bun/fs.ts')).fsApiBun;
  } else if (runtime === 'node') {
    return (await import('./providers/node/fs.ts')).fsApiNode;
  }

  throw new Error(`Unknown runtime: ${runtime}`);
};

export const fsApi = await getFsApi();
