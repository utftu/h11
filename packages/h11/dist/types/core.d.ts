import { Radix } from './radix/radix.ts';
import type { Context, FsApi, Handler } from './types.ts';
export type ExecProps = {
    req: Request;
    providers: Record<string, any>;
    data: Record<any, any>;
};
type NotFoundHandler = (req: Request) => Response | Promise<Response>;
type ErrorHandler = (props: {
    error: Error;
} & Context) => Response | Promise<Response>;
export declare class H11<TExecProps extends ExecProps = ExecProps> {
    types: TExecProps;
    radix: Radix;
    fsApi?: FsApi;
    onNotFound: NotFoundHandler;
    onError: ErrorHandler;
    private addRoute;
    get(pattern: string, ...handlers: Handler[]): this;
    post(pattern: string, ...handlers: Handler[]): this;
    exec({ req, data, providers }: TExecProps): Promise<Response>;
}
export {};
