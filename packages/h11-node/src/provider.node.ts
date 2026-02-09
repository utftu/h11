import type { H11 } from 'h11';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

const joinPaths = (elem1: string, elem2: string): string => {
  if (elem1.at(-1) === '/') {
    if (elem2[0] === '/') {
      return `${elem1}${elem2.slice(1)}`;
    } else {
      return elem1 + elem2;
    }
  } else {
    if (elem2[0] === '/') {
      return elem1 + elem2;
    } else {
      return `${elem1}/${elem2}`;
    }
  }
};

const createReqFromNode = (req: IncomingMessage, origin: string): Request => {
  const method = req.method;
  const headersInit: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headersInit[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  const headers = new Headers(headersInit);

  const body =
    method === 'GET' || method === 'HEAD'
      ? null
      : (Readable.toWeb(req) as any as ReadableStream);

  const base = origin.startsWith('http') ? origin : `http://${origin}`;
  const url = new URL(req.url!, base);

  return new Request(url.toString(), {
    method,
    headers,
    body,
  });
};

const sendNodeRes = (
  responseNative: Response,
  res: ServerResponse<IncomingMessage>
) => {
  const headers: Record<string, string> = {};
  responseNative.headers.forEach((value, key) => (headers[key] = value));

  res.writeHead(responseNative.status, responseNative.statusText, headers);

  if (responseNative.body) {
    const resStream = Readable.fromWeb(responseNative.body as any);
    resStream.pipe(res);
  } else {
    res.end();
  }
};

export const createNodeProvider =
  ({ h11 }: { h11: H11 }) =>
  async ({
    req,
    res,
    origin,
  }: {
    req: IncomingMessage;
    res: ServerResponse<IncomingMessage>;
    origin: string;
  }) => {
    const preparedOrigin = req.headers['host'] || origin;

    const preparedRes = createReqFromNode(req, preparedOrigin);

    const execRes = await h11.exec({
      req: preparedRes,
      data: {},
      providers: {
        node: {
          req,
          res,
        },
      },
    });

    sendNodeRes(execRes, res);
  };
