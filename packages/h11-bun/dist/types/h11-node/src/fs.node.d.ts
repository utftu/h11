import type { FsApi } from 'h11';
export declare const copyFiles: (from: string, to: string) => Promise<void>;
export declare const mkdirNode: (path: string) => Promise<void>;
export declare const rmNode: (path: string) => Promise<void>;
export declare const fsApiNode: FsApi;
