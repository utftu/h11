import { stat } from 'node:fs/promises';
import { joinUserPath } from '../utils/join/join.ts';
import type { Handler } from '../types.ts';
import { getMime, getMimeHeaders } from '../utils/content-type/content-type.ts';

const checkFile = async (filepath: string) => {
  const ent = await stat(filepath).catch(() => undefined);

  if (ent === undefined) {
    return false;
  }

  return ent.isFile();
};

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

const getFiles = (filepath: string, formats: string[]): FileWithExt[] => {
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
  const files = getFiles(filepath, formats);

  // Каталог с тем же именем, что у страницы (assets/blog рядом с
  // assets/blog.html), файлом не считается и в ответ не уезжает.
  const filesChecks = files.map(({ filepath }) => checkFile(filepath));

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

const createHtmlEnt = (file: FileWithExt): FileEnt => {
  const headers: Record<string, string> = {
    [contentTypeName]: getMime('.html'),
  };

  if (file.compressName) {
    headers[contentEncodingName] = file.compressName;
  }

  return { filepath: file.filepath, headers };
};

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

  // Красивые урлы: /blog отдаёт blog.html, / отдаёт index.html. Предсжатые
  // соседи ищутся и тут, иначе compressRecursive для ssg-страниц бесполезен.
  const filenameHtml = await findFilesCompressed(`${filepath}.html`, formats);
  if (filenameHtml) {
    return createHtmlEnt(filenameHtml);
  }

  const filenameIndex = await findFilesCompressed(
    `${filepath}/index.html`,
    formats,
  );
  if (filenameIndex) {
    return createHtmlEnt(filenameIndex);
  }
};

// joinUserPath отбрасывает пути, начинающиеся со слэша — это защита от
// абсолютных путей в пользовательском вводе. Здесь слэш остаётся от самого
// url, а не от пользователя, поэтому один ведущий слэш снимаем сами.
export const cutPrefix = (pathname: string, prefix: string) => {
  const rest = pathname.slice(prefix.length);

  if (rest.startsWith('/')) {
    return rest.slice(1);
  }

  return rest;
};

// Браузер шлёт "gzip, deflate, br" или "br;q=1.0, gzip;q=0.8", а бывает и
// вовсе без пробелов. Вес нас не интересует — только какие форматы вообще
// разрешены, поэтому режем по запятой и отбрасываем всё после ";".
export const parseEncodings = (header: string | null) => {
  if (header === null) {
    return [];
  }

  const encodings: string[] = [];

  for (const part of header.split(',')) {
    const name = part.split(';')[0].trim();

    if (name !== '') {
      encodings.push(name);
    }
  }

  return encodings;
};

// Файла нет — хендлер не отвечает, и запрос идёт дальше по цепочке к
// onNotFound приложения. Свой 404 тут означал бы, что кастомный onNotFound на
// статике не работает.
export const serveFiles = ({
  dir,
  prefix = '',
}: {
  dir: string;
  prefix?: string;
}) => {
  const handler: Handler = async ({ req }) => {
    const url = new URL(req.url);

    const resultPathname = cutPrefix(url.pathname, prefix);
    const filePath = joinUserPath(dir, resultPathname);

    // joinUserPath вернул пустую строку — путь пытался выйти за пределы dir,
    // и щупать файловую систему по нему нельзя.
    if (filePath === '') {
      return;
    }

    const fileEnt = await getFileEnt(
      filePath,
      parseEncodings(req.headers.get('Accept-Encoding')),
    );

    if (!fileEnt) {
      return;
    }

    return new Response(Bun.file(fileEnt.filepath).stream(), {
      status: 200,
      headers: fileEnt.headers,
    });
  };

  return handler;
};
