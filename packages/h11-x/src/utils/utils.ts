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

export const checkFileOptional = async (
  dir: string,
  nameWithoutExt: string,
) => {
  const exts = ['.ts', '.tsx'];

  for (const ext of exts) {
    const filename = `${dir}/${nameWithoutExt}${ext}`;

    if (await Bun.file(filename).exists()) {
      return filename;
    }
  }

  return null;
};

export const checkFile = async (dir: string, nameWithoutExt: string) => {
  const found = await checkFileOptional(dir, nameWithoutExt);
  if (found) return found;

  throw new Error(`No ${nameWithoutExt}.ts or .tsx file in ${dir}`);
};

export const getEntName = (str: string) => {
  return str.split('/').at(-1) as string;
};

export const getEntPath = (pathname: string, dir: string) => {
  const name = getEntName(dir);

  return [...pathname.split('/').slice(0, -1), name].join('/');
};

export const createScriptText = (src: string) => {
  return `<script type="module" defer src="${src}"></script>`;
};

export const createCssLinkText = (href: string) => {
  return `<link rel="stylesheet" href="${href}">`;
};
