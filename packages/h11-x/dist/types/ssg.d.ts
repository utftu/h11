import type { GetHtmlSsg, Route } from './types.ts';
export type Page = {
    pathname: string;
    getHtml: GetHtmlSsg;
};
export declare const makeSsg: ({ routes, prod, baseDir, }: {
    routes: Route[];
    prod: boolean;
    baseDir?: string;
}) => Promise<void>;
