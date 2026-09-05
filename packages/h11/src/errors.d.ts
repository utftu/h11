import type { Context } from './types.ts';
export type NotFoundHandler = (props: Context) => Response | Promise<Response>;
export type ErrorHandler = (props: {
    error: Error;
} & Context) => Response | Promise<Response>;
export declare const defaultOnNotFound: NotFoundHandler;
export declare const defaultOnError: ErrorHandler;
