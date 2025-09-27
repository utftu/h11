import { type IncomingMessage, type ServerResponse } from 'node:http';
import { Transform, type TransformCallback } from 'node:stream';
export declare const convertNodeResToRes: (res: MockServerResponse) => Response;
export declare const createNodeRes: () => MockServerResponse;
export declare class MockServerResponse extends Transform implements ServerResponse<IncomingMessage> {
    statusCode: number;
    statusMessage: string;
    _headers: Record<string, string>;
    private _onEnd?;
    started: boolean;
    promiseEnt: {
        promise: Promise<unknown>;
        controls: {
            resolve: (value?: unknown) => void;
            reject: (reason?: any) => void;
        };
    };
    finished: boolean;
    constructor(onEnd?: () => void);
    assignSocket(): void;
    strictContentLength: boolean;
    detachSocket: () => void;
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void;
    setHeader(name: string, value: string): this;
    getHeader(name: string): string | undefined;
    getHeaders(): Record<string, string>;
    removeHeader(name: string): void;
    writeHead(statusCode: number, reasonOrHeaders?: string | Record<string, string>, headers?: Record<string, string>): this;
    end(...args: any[]): this;
}
