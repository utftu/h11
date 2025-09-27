import { Socket } from 'node:net';
import type { IncomingMessage } from 'node:http';
import { Transform, type TransformCallback } from 'node:stream';
export declare const convertReqToNodeReq: ({ req, url, }: {
    url?: string;
    req: Request;
}) => MockIncomingMessage;
type MockIncomingMessageOptions = {
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
    [key: string]: any;
};
export declare class MockIncomingMessage extends Transform implements IncomingMessage {
    method: string;
    url: string;
    headers: Record<string, string>;
    headersDistinct: Record<string, string[]>;
    rawHeaders: string[];
    _failError?: Error;
    [key: string]: any;
    aborted: boolean;
    httpVersion: string;
    httpVersionMajor: number;
    httpVersionMinor: number;
    complete: boolean;
    trailers: {};
    trailersDistinct: {};
    rawTrailers: never[];
    socket: Socket;
    connection: Socket;
    setTimeout: (msecs: number, callback?: () => void) => this;
    constructor(options: MockIncomingMessageOptions);
    _transform(chunk: any, encoding: BufferEncoding, next: TransformCallback): void;
    _fail(error: Error): void;
}
export {};
