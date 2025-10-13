import type { FsApi } from 'h11';
export declare const checkFile: (dir: string, nameWithoutExt: string, fsApi: FsApi) => Promise<string>;
export declare const getEntName: (str: string) => string;
export declare const getEntPath: (pathname: string, dir: string) => string;
export declare const joinPath: (left: string, right: string) => string;
