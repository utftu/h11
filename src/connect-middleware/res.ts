import { IncomingMessage, type ServerResponse, STATUS_CODES } from 'http';
import { Readable, Transform, type TransformCallback } from 'stream';
import { createControlledPromise } from 'utftu';

export const convertNodeResToRes = (res: MockServerResponse): Response => {
  const stream = Readable.toWeb(res);

  const newRes = new Response(stream as any, {
    status: res.statusCode,
    statusText: res.statusMessage,
    headers: res._headers,
  });

  return newRes;
};

export const createNodeRes = (): MockServerResponse => {
  const nodeRes = new MockServerResponse();

  return nodeRes;
};

export class MockServerResponse
  extends Transform
  implements ServerResponse<IncomingMessage>
{
  public statusCode: number = 200;
  public statusMessage: string = STATUS_CODES[200]!;
  _headers: Record<string, string> = {};
  private _onEnd?: () => void;

  started = false;
  promiseEnt = createControlledPromise();

  finished = false;

  constructor(onEnd?: () => void) {
    super();
    this._onEnd = onEnd;
  }

  assignSocket(): void {}
  strictContentLength: boolean = false;
  detachSocket = () => {};

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    if (!this.started) {
      this.started = true;
      this.promiseEnt.controls.resolve();
    }
    this.push(chunk);
    callback();
  }

  setHeader(name: string, value: string) {
    this._headers[name.toLowerCase()] = value;
    return this;
  }

  getHeader(name: string): string | undefined {
    return this._headers[name.toLowerCase()];
  }

  getHeaders(): Record<string, string> {
    return this._headers;
  }

  removeHeader(name: string): void {
    delete this._headers[name.toLowerCase()];
  }

  // @ts-ignore
  writeHead(
    statusCode: number,
    reasonOrHeaders?: string | Record<string, string>,
    headers?: Record<string, string>
  ): this {
    this.statusCode = statusCode;

    if (typeof reasonOrHeaders === 'string') {
      this.statusMessage = reasonOrHeaders;
    } else {
      this.statusMessage = STATUS_CODES[statusCode] || 'unknown';
      headers = reasonOrHeaders;
    }

    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        this.setHeader(name, value);
      }
    }
    return this;
  }

  // get bodyString(): string {
  //   return Buffer.concat(this._responseData).toString();
  // }

  // get bodyJSON(): unknown {
  //   return JSON.parse(this.bodyString);
  // }

  override end(...args: any[]): this {
    super.end(...args);
    this.finished = true;
    this._onEnd?.call(this);
    this.promiseEnt.controls.resolve();

    return this;
  }

  // Not implemented methods can be stubbed or extended later
  // writeContinue?(): void;
  // setTimeout?(msecs: number, callback?: () => void): this;
  // get headersSent(): boolean;
  // sendDate?: boolean;
  // addTrailers?(headers: NodeJS.OutgoingHttpHeaders): void;
}

// const a = new MockServerResponse(() => {
//   console.log('end');
// });

// const readable = Readable.from('hello world');
// readable.pipe(a);

// const b = Readable.toWeb(a);

// const reader = b.getReader();
// const decoder = new TextDecoder('utf-8');

// const result = await reader.read();

// console.log(decoder.decode(result.value));
