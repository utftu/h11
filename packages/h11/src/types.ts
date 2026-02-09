import type { H11 } from './core.ts';

export type Method = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type Context = {
  req: Request;
  h11: H11;
  providers: Record<string, any>;
  params: Record<string, string>;
  data: Record<any, any>;
};

export type HandlerResponse =
  | Promise<Response | undefined>
  | undefined
  | Promise<undefined>
  | void
  | Promise<void>
  | Response
  | Promise<Response>;

export type Handler = (props: Context) => HandlerResponse;

export type HanlderEnt = {
  handlers: Handler[];
};

export type HandlersProps = Handler[] | [Handler[]] | [HanlderEnt];
export type HandlerReturn = Handler | Handler[] | HanlderEnt;

export type FsApi = {
  getFileStream: (path: string) => ReadableStream;
  writeFileStream: (path: string, stream: ReadableStream) => Promise<void>;
  writeFile: (path: string, text: string) => Promise<void>;
  checkExist: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (from: string, to: string) => Promise<void>;
  rm: (path: string) => Promise<void>;
};
