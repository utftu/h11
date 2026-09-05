import type { FsApi } from '../../../types.ts';
export declare const readdirNode: (path: string) => Promise<{
    name: string;
    directory: boolean;
}[]>;
export declare const copyFiles: (from: string, to: string) => Promise<void>;
export declare const mkdirNode: (path: string) => Promise<void>;
export declare const rmNode: (path: string) => Promise<void>;
export declare const fsApiNode: FsApi;
