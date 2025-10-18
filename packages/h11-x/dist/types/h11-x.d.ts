import { makeSsg } from './ssg.ts';
import { makeSsr, getSsrHtml, readSsrConfig } from './ssr.ts';
import type { Route } from './types.ts';
type BuildProps = {
    baseDir?: string;
    routes: (string | Route)[];
    prod?: boolean;
    devPrefix?: string;
    prefix?: string;
};
export declare const defaultDevPrefix = "/_vite";
export declare const defaultPrefix = "/h11x";
export declare const defaultFullPrefix: string;
export declare const makeRouteUniversal: (route: string | Route) => Route;
export declare const buildH11X: ({ baseDir, prod, routes, prefix, devPrefix, }: BuildProps) => Promise<void>;
export { makeSsg, makeSsr, getSsrHtml, readSsrConfig };
