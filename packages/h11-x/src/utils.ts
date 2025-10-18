import type { FsApi } from 'h11';
import { cwd } from 'node:process';

export const getDefaultBasedir = () => {
  return `${cwd()}/.h11x`;
};

export const convertStreamToString = async (stream: ReadableStream) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode(); // финализируем декодер
  return result;
};

export const checkFile = async (
  dir: string,
  nameWithoutExt: string,
  fsApi: FsApi
) => {
  const exts = ['.ts', '.tsx'];
  const variantsEnt = exts.map((ext) => {
    const filename = dir + '/' + nameWithoutExt + ext;
    return {
      filename,
      promise: fsApi.checkExist(dir + '/' + nameWithoutExt + ext),
    };
  });

  for (const { promise, filename } of variantsEnt) {
    const fileExist = await promise;

    if (fileExist) {
      return filename;
    }
  }

  throw new Error('Unknown file pattern');
};

export const getEntName = (str: string) => {
  return str.split('/').at(-1) as string;
};

export const getEntPath = (pathname: string, dir: string) => {
  const name = getEntName(dir);

  return [...pathname.split('/').slice(0, -1), name].join('/');
};

export const joinPath = (left: string, right: string) => {
  if (left === '') {
    return right;
  }

  if (right === '') {
    return left;
  }

  const preparedLeft = left.endsWith('/') ? left.slice(0, -1) : left;
  const preparedRight = right.startsWith('/') ? right.slice(1) : right;
  return preparedLeft + '/' + preparedRight;
};
