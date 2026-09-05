import { Radix } from './radix/radix.ts';
import type { DataModule, FsApi, Handler } from './types.ts';
import { type ErrorHandler, type NotFoundHandler } from './errors.ts';
export declare const REQUEST_ID_HEADER = "x-request-id";
export declare class H11<TData extends Record<any, any> = {}> {
    radix: Radix;
    fsApi?: FsApi;
    ee: import("utftu").EE<{
        code: {
            code: number;
            text: string;
        };
    } & Record<string, any>>;
    data: Record<string, any>;
    onNotFound: NotFoundHandler;
    onError: ErrorHandler;
    private addRoute;
    get(pattern: string, ...handlers: Handler<TData>[]): this;
    post(pattern: string, ...handlers: Handler<TData>[]): this;
    put(pattern: string, ...handlers: Handler<TData>[]): this;
    delete(pattern: string, ...handlers: Handler<TData>[]): this;
    patch(pattern: string, ...handlers: Handler<TData>[]): this;
    head(pattern: string, ...handlers: Handler<TData>[]): this;
    options(pattern: string, ...handlers: Handler<TData>[]): this;
    use<TAdded extends Record<any, any>>(pattern: string, handler: DataModule<TAdded>): H11<TData & TAdded>;
    use<TAdded extends Record<any, any>>(handler: DataModule<TAdded>): H11<TData & TAdded>;
    use(pattern: string, ...handlers: Handler<TData>[]): this;
    use(...handlers: Handler<TData>[]): this;
    exec({ req, data, providers, }: {
        req: Request;
        data: Record<string, string>;
        providers: Record<string, any>;
    }): Promise<Response>;
}
