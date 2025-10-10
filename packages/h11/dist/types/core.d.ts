import { Radix } from './radix/radix.ts';
import type { Context, FsApi, Handler } from './types.ts';
import { type EE } from 'utftu';
type NotFoundHandler = (props: Context) => Response | Promise<Response>;
type ErrorHandler = (props: {
    error: Error;
} & Context) => Response | Promise<Response>;
export declare class H11<TExecProps extends Context = Context> {
    types: TExecProps;
    radix: Radix;
    fsApi?: FsApi;
    ee: EE<{
        code: {
            code: number;
            text: string;
        };
    } & Record<string, any>>;
    onNotFound: NotFoundHandler;
    onError: ErrorHandler;
    private addRoute;
    get(pattern: string, ...handlers: Handler[]): this;
    post(pattern: string, ...handlers: Handler[]): this;
    exec({ req, data, providers }: TExecProps): Promise<Response>;
}
export {};
