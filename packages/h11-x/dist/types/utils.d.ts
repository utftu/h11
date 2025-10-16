import type { FsApi } from 'h11';
export declare const getDefaultBasedir: () => string;
export declare const convertStreamToString: (stream: ReadableStream) => Promise<string>;
export declare const checkFile: (dir: string, nameWithoutExt: string, fsApi: FsApi) => Promise<string>;
export declare const getEntName: (str: string) => string;
export declare const getEntPath: (pathname: string, dir: string) => string;
export declare const joinPath: (left: string, right: string) => string;
