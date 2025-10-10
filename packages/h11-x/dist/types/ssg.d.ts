import type { GetHtmlSsg, SsgRoute } from './types.ts';
export type Page = {
    pathname: string;
    getHtml: GetHtmlSsg;
};
export declare const makeSsg: ({ routes, prod, baseDir, }: {
    routes: SsgRoute[];
    prod: boolean;
    baseDir?: string;
}) => Promise<void>;
