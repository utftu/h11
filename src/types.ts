export type Method = 'GET' | 'POST' | 'DELET' | 'PUT' | 'PATCH';

export type Context = {
  req: Request;
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
