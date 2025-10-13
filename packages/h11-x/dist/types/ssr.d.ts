import { type ViteDevServer } from 'vite';
export declare const makeSsr: ({ routes, baseDir, }: {
    routes: string[];
    baseDir?: string;
}) => Promise<void>;
export declare const getSsrHtml: ({ prod, pathToFile, pathname, vite, baseDir, }: {
    pathToFile: string;
    prod: boolean;
    pathname: string;
    vite?: ViteDevServer;
    baseDir?: string;
}) => Promise<any>;
