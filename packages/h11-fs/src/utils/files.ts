import { fsApi } from '../api.ts';

type FileWithExt = {
  filepath: string;
  compressName: string;
};

type FileEnt = {
  filepath: string;
  headers: Record<string, string>;
};

const exts = {
  js: 'text/javascript',
  html: 'text/html; charset=utf-8',
};

const getContentType = (filepath: string) => {
  const ext = filepath.split('.').at(-1);

  if (!ext) {
    return;
  }

  if (ext in exts) {
    return exts[ext as keyof typeof exts];
  }

  return;
};

const formatsEnt = [
  { name: 'deflate', ext: 'deflate' },
  { name: 'br', ext: 'br' },
  { name: 'gzip', ext: 'gz' },
] as const;

const gitFiles = (filepath: string, formats: string[]): FileWithExt[] => {
  const files: FileWithExt[] = [];

  for (const formatEnt of formatsEnt) {
    if (formats.includes(formatEnt.name)) {
      files.push({
        filepath: `${filepath}.${formatEnt.ext}`,
        compressName: formatEnt.name,
      });
    }
  }

  files.push({ filepath, compressName: '' });

  return files;
};

const findFilesCompressed = async (
  filepath: string,
  formats: string[]
): Promise<FileWithExt | undefined> => {
  const files = gitFiles(filepath, formats);

  const filesChecks = files.map(({ filepath }) => fsApi.checkExist(filepath));

  for (let i = 0; i <= filesChecks.length; i++) {
    const fileCheck = filesChecks[i];
    const checkResult = await fileCheck;

    if (checkResult) {
      const file = files[i];
      return file;
    }
  }
};

const conentEncodingName = 'content-encoding' as const;
const contentTypeName = 'content-type' as const;

export const getFileEnt = async (
  filepath: string,
  formats: string[]
): Promise<FileEnt | undefined> => {
  const headers: Record<string, string> = {};
  const fileEnt = await findFilesCompressed(filepath, formats);
  if (fileEnt) {
    if (fileEnt.compressName) {
      headers[conentEncodingName] = fileEnt.compressName;
    }
    const contentType = getContentType(filepath);
    if (contentType) {
      headers[contentTypeName] = contentType;
    }
    return {
      filepath: fileEnt.filepath,
      headers,
    };
  }

  const filenameHtml = await findFilesCompressed(`${filepath}.html`, []);
  if (filenameHtml) {
    return {
      filepath: filenameHtml.filepath,
      headers: {
        [contentTypeName]: exts.html,
      },
    };
  }
};
