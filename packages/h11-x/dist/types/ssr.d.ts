import { type ViteDevServer } from 'vite';
import type { Route } from './types.ts';
export declare const SCRIPT_KEY = "<template id=\"H11X_SCRIPT_CLIENT\"></template>";
type Config = {
    prod: boolean;
    routes: Record<string, {
        client: string;
        clientRaw: string;
        clientUrl: string;
        ssrFile: string;
        ssrFileRaw: string;
    }>;
};
export declare const makeSsr: ({ routes, baseDir, prod, }: {
    routes: Route[];
    baseDir?: string;
    prod: boolean;
}) => Promise<void>;
export declare const readSsrConfig: (baseDir?: string) => Promise<Config>;
export declare const getSsrHtml: ({ vite, config, name, }: {
    vite?: ViteDevServer;
    config: Config;
    name: string;
}) => Promise<() => any>;
export {};
