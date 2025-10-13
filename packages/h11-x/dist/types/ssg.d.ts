import type { GetHtmlSsg } from './types.ts';
export type Page = {
    pathname: string;
    getHtml: GetHtmlSsg;
};
export declare const makeSsg: ({ routes, prod, baseDir, }: {
    routes: string[];
    prod: boolean;
    baseDir?: string;
}) => Promise<void>;
