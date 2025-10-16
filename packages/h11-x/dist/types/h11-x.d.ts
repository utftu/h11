import { makeSsg } from './ssg.ts';
import { makeSsr, getSsrHtml, readSsrConfig } from './ssr.ts';
import type { Route } from './types.ts';
type BuildProps = {
    baseDir?: string;
    routes: (string | Route)[];
    prod?: boolean;
};
export declare const makeRouteUniversal: (route: string | Route) => Route;
export declare const buildH11X: ({ baseDir, prod, routes, }: BuildProps) => Promise<void>;
export { makeSsg, makeSsr, getSsrHtml, readSsrConfig };
