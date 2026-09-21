import { fsApi } from '../fs/api.ts';
import { getMime, getMimeHeaders } from './content-type.ts';

type FileWithExt = {
  filepath: string;
  compressName: string;
};

type FileEnt = {
  filepath: string;
  headers: Record<string, string>;
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
  formats: string[],
): Promise<FileWithExt | undefined> => {
  const files = gitFiles(filepath, formats);

  // Именно checkFile, а не checkExist: каталог с тем же именем, что у
  // страницы (assets/blog и assets/blog.html), не должен уезжать в ответ.
  const filesChecks = files.map(({ filepath }) => fsApi.checkFile(filepath));

  for (let i = 0; i < filesChecks.length; i++) {
    const fileCheck = filesChecks[i];
    const checkResult = await fileCheck;

    if (checkResult) {
      const file = files[i];
      return file;
    }
  }
};

const contentEncodingName = 'content-encoding' as const;
const contentTypeName = 'content-type' as const;

export const getFileEnt = async (
  filepath: string,
  formats: string[],
): Promise<FileEnt | undefined> => {
  const fileEnt = await findFilesCompressed(filepath, formats);
  if (fileEnt) {
    const headers: Record<string, string> = getMimeHeaders(filepath);
    if (fileEnt.compressName) {
      headers[contentEncodingName] = fileEnt.compressName;
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
        [contentTypeName]: getMime('.html'),
      },
    };
  }

  const filenameIndex = await findFilesCompressed(`${filepath}/index.html`, []);
  if (filenameIndex) {
    return {
      filepath: filenameIndex.filepath,
      headers: {
        [contentTypeName]: getMime('.html'),
      },
    };
  }
};
