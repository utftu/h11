const exts = {
  js: 'text/javascript',
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  css: 'text/css',
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8',
};

// Расширение берётся от имени файла, а не от всего пути: в каталогах тоже
// бывают точки. Голое расширение — тоже путь: getMime('.html').
export const getMime = (filepath: string) => {
  const filename = filepath.split('/').at(-1) as string;
  const ext = filename.split('.').at(-1) as string;

  return exts[ext as keyof typeof exts];
};

// Для незнакомого расширения заголовка нет вообще — пустой объект, а не
// content-type со значением undefined.
export const getMimeHeaders = (filepath: string): Record<string, string> => {
  const mime = getMime(filepath);

  if (mime === undefined) {
    return {};
  }

  return {
    'content-type': mime,
  };
};

export type Mime = keyof typeof exts;

export type InitProps = {
  mime?: Mime;
  code?: number;
  headers?: Record<string, string>;
};

const createInit = ({ mime, code, headers = {} }: InitProps): ResponseInit => {
  const headersResult: Record<string, string> = { ...headers };

  if (mime !== undefined) {
    headersResult['content-type'] = exts[mime];
  }

  if (code === undefined) {
    return { headers: headersResult };
  }

  return { headers: headersResult, status: code };
};

// Ответ собирается руками, поэтому тип страницы тут — ключ таблицы, а не путь:
// компилятор ловит опечатку и подсказывает варианты. getMime и getMimeHeaders
// остаются про путь — они разбирают файл с диска, а не пишутся в коде.
// Две формы: короткая позиционная и объектная, когда аргументов много.
export function getInit(props?: InitProps): ResponseInit;
export function getInit(
  mime: Mime,
  code?: number,
  headers?: Record<string, string>,
): ResponseInit;
export function getInit(
  mimeOrProps?: Mime | InitProps,
  code?: number,
  headers?: Record<string, string>,
): ResponseInit {
  if (typeof mimeOrProps === 'object') {
    return createInit(mimeOrProps);
  }

  return createInit({ mime: mimeOrProps, code, headers });
}
