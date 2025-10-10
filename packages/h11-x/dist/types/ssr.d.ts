import { type ViteDevServer } from 'vite';
import type { SsrRoute } from './types.ts';
export declare const makeSsr: ({ routes, baseDir, }: {
    routes: SsrRoute[];
    baseDir?: string;
}) => Promise<void>;
export declare const getSsrHtml: ({ isProd, pathToFile, pathname, vite, baseDir, }: {
    pathToFile: string;
    isProd: boolean;
    pathname: string;
    vite?: ViteDevServer;
    baseDir?: string;
}) => Promise<any>;
