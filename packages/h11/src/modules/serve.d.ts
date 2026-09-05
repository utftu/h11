import type { Handler } from '../types.ts';
export declare const serveFiles: ({ dir, prefix, }: {
    dir: string;
    prefix?: string;
}) => Handler;
