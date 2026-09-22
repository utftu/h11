import type { H11 } from './core/core.ts';

export type Method =
  'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type Context<TData extends Record<any, any> = {}> = {
  req: Request;
  h11: H11<TData>;
  providers: Record<string, any>;
  params: Record<string, string>;
  data: TData;
  reqId: string;
};

export type HandlerResponse =
  | Promise<Response | undefined>
  | undefined
  | Promise<undefined>
  | void
  | Promise<void>
  | Response
  | Promise<Response>;

export type Handler<TData extends Record<any, any> = {}> = (
  props: Context<TData>,
) => HandlerResponse;

export type HandlerReturn = Handler | Handler[];
