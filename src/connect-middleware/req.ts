import { Socket } from 'net';
import type { IncomingMessage } from 'http';
import { Transform, type TransformCallback } from 'stream';

export const convertReqToNodeReq = ({
  req,
  url,
}: {
  url?: string;
  req: Request;
}): MockIncomingMessage => {
  const headers: Record<string, string> = {};

  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const nodeReq = new MockIncomingMessage({
    method: req.method,
    url: url || req.url,
    headers,
  });

  return nodeReq;
};

const socket = new Socket();

type MockIncomingMessageOptions = {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  [key: string]: any;
};

export class MockIncomingMessage extends Transform implements IncomingMessage {
  method: string;
  url: string;
  headers: Record<string, string> = {};
  headersDistinct: Record<string, string[]> = {};
  rawHeaders: string[] = [];
  _failError?: Error;
  [key: string]: any;

  // mock for IncomingMessage
  aborted = false;
  httpVersion = '1.1';
  httpVersionMajor = 1;
  httpVersionMinor = 1;
  complete = false;
  trailers = {};
  trailersDistinct = {};
  rawTrailers = [];
  socket = socket;
  connection = socket;
  setTimeout: (msecs: number, callback?: () => void) => this;

  constructor(options: MockIncomingMessageOptions) {
    super();

    const self = this;

    // Copy unreserved options
    const reservedOptions = ['method', 'url', 'headers', 'rawHeaders'];
    Object.keys(options).forEach((key) => {
      if (!reservedOptions.includes(key)) {
        this[key] = options[key];
      }
    });

    this.method = options.method || 'GET';
    this.url = options.url || '';
    this.setTimeout = (delay, cb) => {
      if (!cb) {
        return self;
      }
      setTimeout(cb, delay);
      return self;
    };

    // Set header names
    this.headers = {};
    this.rawHeaders = [];
    if (options.headers) {
      Object.keys(options.headers).forEach((key) => {
        const val = options.headers![key];
        if (val !== undefined) {
          const headerValue = typeof val !== 'string' ? String(val) : val;
          this.headers[key.toLowerCase()] = headerValue;
          this.rawHeaders.push(key);
          this.rawHeaders.push(headerValue);
          this.headersDistinct[key] = [val];
        }
      });
    }

    // Auto-end when no body
    if (
      this.method === 'GET' ||
      this.method === 'HEAD' ||
      this.method === 'DELETE'
    ) {
      this.end();
    }
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    next: TransformCallback
  ): void {
    if (this._failError) {
      this.emit('error', this._failError);
      return;
    }
    this.push(chunk);
    next();
  }

  _fail(error: Error): void {
    this._failError = error;
  }
}
