import type { H11 } from './core.ts';
export type Method = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type Context<TData extends Record<any, any> = {}> = {
    req: Request;
    h11: H11<TData>;
    providers: Record<string, any>;
    params: Record<string, string>;
    data: TData;
    reqId: string;
};
export type HandlerResponse = Promise<Response | undefined> | undefined | Promise<undefined> | void | Promise<void> | Response | Promise<Response>;
export type Handler<TData extends Record<any, any> = {}> = (props: Context<TData>) => HandlerResponse;
export type DataModule<TAdded extends Record<any, any>> = Handler<any> & {
    __adds?: TAdded;
};
export type HandlerReturn = Handler | Handler[];
export type FsApi = {
    getFileStream: (path: string) => ReadableStream;
    writeFileStream: (path: string, stream: ReadableStream) => Promise<void>;
    writeFile: (path: string, text: string) => Promise<void>;
    checkExist: (path: string) => Promise<boolean>;
    mkdir: (path: string) => Promise<void>;
    copyFile: (from: string, to: string) => Promise<void>;
    rm: (path: string) => Promise<void>;
    readdir: (path: string) => Promise<{
        name: string;
        directory: boolean;
    }[]>;
};
